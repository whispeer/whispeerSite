/** our keystore.
	handles all the keys, passwords, etc.
	keys are a little difficult because some keys look different but are the same because they are encrypted differently
	also keys always have a decryptor because the are never distributed alone.
	
	uploading:
		key -> addSymDecryptor/addAsymDecryptor/addPWDecryptor -> intKey
		key -> getUploadData() -> intKey
		do for multiple keys, concat, submit.

	the key should cache which of its data is dirty and which is not.
	removing decryptors (later) should update directly if the key as such is already saved.
	
	keyid: identifier@timestamp
**/
define(["step", "whispeerHelper", "crypto/helper", "libs/sjcl", "crypto/waitForReady", "cryptoWorker/sjclWorkerInclude", "asset/errors"], function (step, h, chelper, sjcl, waitForReady, sjclWorkerInclude, errors) {
	"use strict";

	var socket, firstVerify = true, afterRequireCall, improvementListener = [], makeKey, keyStore;
	/** dirty and new keys to upload. */
	var dirtyKeys = [], newKeys = [];

	/** cache for keys */
	var symKeys = {}, cryptKeys = {}, signKeys = {};
	var password = "",  keyGenIdentifier = "", mainKey;

	/** identifier list of keys we can use for encryption. this is mainly a safeguard for coding bugs. */
	var keysUsableForEncryption = [];

	/** our classes */
	var Key, SymKey, CryptKey, SignKey;

	sjcl.random.startCollectors();

	var MAXSPEED = 99999999999, SPEEDS = {
		symKey: {
			loaded: 3,
			unloaded: 50
		},
		cryptKey: {
			loaded: 100,
			unloaded: 150
		},
		pw: 3
	};

	try {
		if (localStorage) {
			var pw = localStorage.getItem("password");
			if (pw && typeof pw === "string") {
				password = pw;
			}
		}
	} catch (e) {
		console.log(e);
	}

	function makeKeyUsableForEncryption(realid) {
		var fp = realid.split(":")[1];
		keysUsableForEncryption.push(fp);
	}

	function isKeyUsableForEncryption(realid) {
		var fp = realid.split(":")[1];
		return keysUsableForEncryption.indexOf(fp) > -1;
	}

	function toPrivateKey(type, curve) {
		return function (secret) {
			var exponent = new sjcl.bn(chelper.bits2hex(secret));

			return new type.secretKey(curve, exponent);
		};
	}

	function removeExpectedPrefix(bitArray, prefix) {
		var len = prefix.length, part = sjcl.bitArray.bitSlice(bitArray, 0, 8*len);
		prefix = sjcl.codec.utf8String.toBits(prefix);

		if (sjcl.bitArray.equal(prefix, part)) {
			return sjcl.bitArray.bitSlice(bitArray, 8*len);
		} else {
			throw new errors.DecryptionError("invalid prefix (should be: " + prefix + ")");
		}
	}

	//TODO: webworkers: 
	//var webWorker = Modernizr.webworkers;

	/** generate an id */
	function generateid(base) {
		var id = keyGenIdentifier + ":" + chelper.bits2hex(base);

		if (symKeys[id] || cryptKeys[id] || signKeys[id]) {
			throw new errors.SecurityError("key already existing with same content ... this should never happen!");
		}

		return id;
	}

	function correctKeyIdentifier(realid) {
		var parts = realid.split(":");

		if (parts.length !== 2) {
			throw new errors.InvalidDataError("Key id does not match format!");
		}

		if (parts[0].length === 0) {
			return keyGenIdentifier + ":" + parts[1];
		}

		return realid;
	}

	/** encrypt with password
	* @param pw password to encrypt
	* @param text text to encrypt
	* @param callback callback
	*/
	function encryptPW(pw, text, callback) {
		step(function () {
			var result = sjcl.encrypt(pw, text);
			this.ne(chelper.sjclPacket2Object(result));
		}, callback);
	}

	/** our internal decryption function.
	* @param decryptorid id of decryptor
	* @param decryptortype decryptor type
	* @param ctext crypted text
	* @param callback called with results
	* @param iv necessary for symkey/pw encrypted data
	* @param salt necessary for pw encrypted data
	*/
	function internalDecrypt(decryptorid, decryptortype, ctext, callback, iv, salt) {
		step(function () {
			var cryptor;
			if (decryptortype === "symKey") {
				step(function () {
					SymKey.get(decryptorid, this);
				}, h.sF(function (theKey) {
					cryptor = theKey;
					theKey.decryptKey(this);
				}), h.sF(function () {
					cryptor.decrypt(ctext, this, iv);
				}), h.sF(function (decryptedData) {
					this.ne(removeExpectedPrefix(decryptedData, "key::"));
				}), callback);
			} else if (decryptortype === "cryptKey") {
				step(function () {
					CryptKey.get(decryptorid, this);
				}, h.sF(function (theKey) {
					cryptor = theKey;
					theKey.decryptKey(this);
				}), h.sF(function () {
					cryptor.unkem(chelper.hex2bits(ctext), this);
				}), callback);
			} else if (decryptortype === "pw") {
				step(function () {
					var jsonData = chelper.Object2sjclPacket({
						ct: ctext,
						iv: iv,
						salt: salt
					}), result;
					if (password !== "") {
						result = sjcl.decrypt(password, jsonData, { raw: 1 });

						this.ne(removeExpectedPrefix(result, "key::"));
						return;
					}

					throw new errors.DecryptionError("no pw");
				}, callback);
			} else {
				throw new errors.InvalidDataError("invalid decryptortype");
			}
		}, callback);
	}

	/** returns a decryptors object if loaded
	* @param decryptorData
	* @return decryptorObject or null
	*/
	function getDecryptor(decryptorData) {
		if (decryptorData.type === "symKey") {
			return symKeys[decryptorData.decryptorid];
		}

		if (decryptorData.type === "cryptKey") {
			return cryptKeys[decryptorData.decryptorid];
		}

		return null;
	}

	/** general key object.
	* @param realid keys real id
	* @param decryptors array of decryptor data
	* @param optional secret unencrypted secret if we already have it
	*/
	Key = function keyConstructor(superKey, realid, decryptors, optionals) {
		var theKey = this, decrypted = new h.FullFiller(), dirtyDecryptors = [], internalSecret, preSecret;

		if (!decryptors) {
			decryptors = [];
		}

		/** identity past processor */
		var pastProcessor = function pastProcessor(secret) {
			return secret;
		};

		optionals = optionals || {};

		if (typeof optionals.pastProcessor === "function") {
			pastProcessor = optionals.pastProcessor;
		}

		if (optionals.secret) {
			preSecret = optionals.secret;
			internalSecret = pastProcessor(optionals.secret);
			decrypted.success();
		}

		/** is the key decrypted */
		function decryptedF() {
			return decrypted.isSuccess();
		}

		function decryptKey(cb) {
			var usedDecryptor;
			step(function () {
				usedDecryptor = theKey.getFastestDecryptor();

				if (!usedDecryptor || !usedDecryptor.decryptor) {
					throw new errors.DecryptionError("Could not Decrypt key!");
				}

				var d = usedDecryptor.decryptor;

				internalDecrypt(d.decryptorid, d.type, d.ct, this, d.iv, d.salt);
			}, function (err, result) {
				if (err || result === false) {
					console.log("decryptor failed for key: " + realid);

					decryptors = decryptors.filter(function (decryptor) {
						return decryptor !== usedDecryptor;
					});

					if (decryptors.length === 0) {
						throw new errors.DecryptionError("Could finally not decrypt key!");
					}

					theKey.decryptKey(cb);
					return;
				}

				this.ne(pastProcessor(result));

				if (usedDecryptor.decryptor.type === "cryptKey") {
					h.callEach(improvementListener, [theKey.getRealID()]);
				}
			}, h.sF(function (pastProcessedSecret) {
				preSecret = internalSecret;
				internalSecret = pastProcessedSecret;
				this.ne();
			}), cb);
		}

		/** decrypt this key.
		* @param callback called with true/false
		* searches your whole keyspace for a decryptor and decrypts if possible
		*/
		function decryptKeyF(callback) {
			step(function () {
				decrypted.await(callback);
				decrypted.start(this);
			}, h.sF(function () {
				decryptKey(this);
			}), decrypted.finish);
		}
		this.decrypted = decryptedF;
		this.decryptKey = decryptKeyF;


		/** getter for real id */
		function getRealIDF() {
			return correctKeyIdentifier(realid);
		}
		this.getRealID = getRealIDF;

		this.getRealidFingerPrint = function () {
			return realid.split(":")[1];
		};

		/** getter for decryptors array
		* copies array before returning
		*/
		function getDecryptorsF() {
			var result = [], i, tempR, k;
			for (i = 0; i < decryptors.length; i += 1) {
				tempR = {};
				for (k in decryptors[i]) {
					if (decryptors[i].hasOwnProperty(k)) {
						tempR[k] = decryptors[i][k];
					}
				}

				result.push(tempR);
			}

			return result;
		}
		this.getDecryptors = getDecryptorsF;

		/** get the fastest decryptor for this key.
		* @param level only used for recursion prevention.
		* @return {
		*  speed: speed of decryptor found.
		*  decryptor: decryptor found.
		* }
		*/
		function getFastestDecryptorF(level) {
			if (!level) {
				level = 0;
			}

			if (level > 100) {
				console.log("dafuq, deeply nested keys");
				return MAXSPEED;
			}

			var i, cur, key, decryptorIndex = 0, smallest = MAXSPEED, subKeyData, speed, curSpeeds;
			for (i = 0; i < decryptors.length; i += 1) {
				cur = decryptors[i];
				curSpeeds = SPEEDS[cur.type];

				if (!curSpeeds) {
					speed = MAXSPEED;
				} else if (typeof curSpeeds === "number") {
					speed = curSpeeds;
				} else {
					key = getDecryptor(cur);
					if (key) {
						if (key.decrypted()) {
							speed = curSpeeds.loaded;
						} else {
							subKeyData = key.getFastestDecryptor(level + 1);
							speed = curSpeeds.loaded + subKeyData.speed;
						}
					} else {
						speed = curSpeeds.unloaded;
					}
				}

				if (speed < smallest) {
					smallest = speed;
					decryptorIndex = i;
				}
			}

			return {
				speed: smallest,
				decryptor: decryptors[decryptorIndex]
			};
		}
		this.getFastestDecryptor = getFastestDecryptorF;

		/** add crypt Key decryptor
		* @param realid decryptor key realid
		* @param tag decryption tag
		* @param callback callback
		*/
		function addAsymDecryptorF(realid, tag, callback) {
			step(function () {
				var decryptorData = {
					decryptorid: realid,
					type: "cryptKey",
					ct: chelper.bits2hex(tag),
					dirty: true
				};

				decryptors.push(decryptorData);
				dirtyKeys.push(superKey);
				dirtyDecryptors.push(decryptorData);

				this.ne();
			}, callback);
		}

		/** add symKey decryptor.
		* @param realid realid of decryptor
		* @param callback callback
		*/
		function addSymDecryptorF(realid, callback) {
			var cryptor;
			step(function addSymD1() {
				SymKey.get(realid, this);
			}, h.sF(function addSymD2(cryptorKey) {
				cryptor = cryptorKey;
				theKey.decryptKey(this);
			}), h.sF(function addSymD3() {
				var secret = preSecret || internalSecret;
				cryptor.encryptWithPrefix("key::", secret, this);
			}), h.sF(function addSymD4(data) {
				var decryptorData = {
					decryptorid: realid,
					type: "symKey",
					ct: chelper.bits2hex(data.ct),
					iv: chelper.bits2hex(data.iv),
					dirty: true
				};

				decryptors.push(decryptorData);
				dirtyKeys.push(superKey);
				dirtyDecryptors.push(decryptorData);

				this.ne(realid);
			}), callback);
		}

		/** add a pw decryptor
		* @param pw password
		* @param callback callback
		*/
		function addPWDecryptorF(pw, callback) {
			step(function () {
				var prefix = sjcl.codec.utf8String.toBits("key::");
				var data = sjcl.bitArray.concat(prefix, preSecret);

				this.ne(chelper.sjclPacket2Object(sjcl.encrypt(pw, data)));
			}, h.sF(function (data) {
				var decryptorData = {
					//Think, shortHash here? id: ?,
					type: "pw",
					ct: chelper.bits2hex(data.ct),
					iv: chelper.bits2hex(data.iv),
					salt: chelper.bits2hex(data.salt),
					dirty: true
				};

				decryptors.push(decryptorData);
				dirtyKeys.push(superKey);
				dirtyDecryptors.push(decryptorData);

				this.ne();
			}), callback);
		}

		this.addAsymDecryptor = addAsymDecryptorF;
		this.addSymDecryptor = addSymDecryptorF;
		this.addPWDecryptor = addPWDecryptorF;

		/** get all data which need uploading. */
		function getDecryptorDataF() {
			//get the upload data for the decryptors of this key.
			//this will be called in the keys upload() function.
			var result = [], i, tempR, k;
			for (i = 0; i < dirtyDecryptors.length; i += 1) {
				tempR = {};
				for (k in dirtyDecryptors[i]) {
					if (dirtyDecryptors[i].hasOwnProperty(k)) {
						tempR[k] = dirtyDecryptors[i][k];
					}
				}

				if (tempR.decryptorid) {
					tempR.decryptorid = correctKeyIdentifier(tempR.decryptorid);
				}
				result.push(tempR);
			}

			return result;
		}
		this.getDecryptorData = getDecryptorDataF;

		/** check if this key has dirty decryptors */
		function isDirtyF() {
			return (theKey.dirtyDecryptors.length !== 0);
		}
		this.isDirty = isDirtyF;

		/** remove uploaded keys from dirty array */
		function removeDirtyF(keys) {
			var remaining = [], i, j, isRemaining, curD, curK;
			for (i = 0; i < dirtyDecryptors.length; i += 1) {
				curD = dirtyDecryptors[i];
				isRemaining = true;
				for (j = 0; j < keys.length; j += 1) {
					curK = keys[j];
					if (curD.type === curK.type && curD.ct === curK.ct && curD.decryptorid === curK.decryptorid) {
						keys.splice(j, 1);
						isRemaining = false;

						break;
					}
				}

				if (isRemaining) {
					remaining.push(curD);
				}
			}

			dirtyDecryptors = remaining;
		}
		this.removeDirty = removeDirtyF;

		/** get the secret of this key */
		function getSecretF() {
			if (decrypted.isSuccess()) {
				return internalSecret;
			}

			return false;
		}
		this.getSecret = getSecretF;
	};

	/** a SymKey.
	* @param keyData if not set: generate key; if string: hex of unencrypted key; otherwise: key data
	* @attribute id
	* @attribute realid
	* @attribute decryptor data
	* @attribute encrypted key
	* implements all symmetric key functions.
	*/
	SymKey = function (keyData) {
		var intKey, comment = "";

		if (!keyData) {
			keyData = sjcl.random.randomWords(8);
		}

		if (typeof keyData === "string") {
			keyData = chelper.hex2bits(keyData);
		} 

		if (keyData instanceof Array) {
			intKey = new Key(this, generateid(fingerPrintSymKey(keyData)), [], {secret: keyData});
		} else {
			intKey = new Key(this, keyData.realid, keyData.decryptors, {
				pastProcessor: function (secret) {
					var fp = fingerPrintSymKey(secret);
					if (fp !== intKey.getRealidFingerPrint()) {
						throw new errors.ValidationError("Fingerprint and Key id do not match");
					}
					return secret;
				}
			});
		}

		this.getAccessCount = function () {
			return keyData.accessCount;
		};

		this.getUploadData = function () {
			var data = {
				realid: intKey.getRealID(),
				type: "sym",
				decryptors: this.getDecryptorData(),
				comment: comment
			};

			return data;
		};

		this.getDecryptorData = intKey.getDecryptorData;

		this.getRealID = intKey.getRealID;
		this.getDecryptors = intKey.getDecryptors;
		this.decrypted = intKey.decrypted;

		this.addAsymDecryptor = intKey.addAsymDecryptor;
		this.addSymDecryptor = intKey.addSymDecryptor;
		this.addPWDecryptor = intKey.addPWDecryptor;

		this.decryptKey = intKey.decryptKey;
		this.getFastestDecryptor = intKey.getFastestDecryptor;

		this.setComment = function setCommentF(theComment) {
			if (theComment) {
				comment = theComment;
			}
		};

		/** encrypt a text.
		* @param text text to encrypt
		* @param callback called with result
		* @param optional iv initialization vector
		*/
		function encryptF(text, callback, iv) {
			if (!isKeyUsableForEncryption(intKey.getRealID())) {
				throw new errors.SecurityError("Key not usable for encryption: " + intKey.getRealID());
			}

			if (iv) {
				throw new Error("found iv usage");
			}

			debugger;
			throw new Error("bla");

			step(function symEncryptI1() {
				intKey.decryptKey(this);
			}, h.sF(function symEncryptI2() {
				var result = sjcl.encrypt(chelper.hex2bits(intKey.getSecret()), text);

				this.ne(chelper.sjclPacket2Object(result));
			}), callback);
		}

		this.encryptWithPrefix = function (prefix, data, callback) {
			if (!isKeyUsableForEncryption(intKey.getRealID())) {
				throw new errors.SecurityError("Key not usable for encryption: " + intKey.getRealID());
			}

			step(function symEncryptI1() {
				intKey.decryptKey(this);
			}, h.sF(function symEncryptI2() {
				if (typeof data === "string") {
					data = sjcl.codec.utf8String.toBits(data);
				}

				prefix = sjcl.codec.utf8String.toBits(prefix);
				data = sjcl.bitArray.concat(prefix, data);

				var result = sjcl.encrypt(intKey.getSecret(), data);

				this.ne(chelper.sjclPacket2Object(result));
			}), callback);
		};

		/** decrypt some text.
		* @param ctext text to decrypt
		* @param callback called with results
		* @param optional iv initialization vector
		*/
		function decryptF(ctext, callback, iv) {
			step(function symDecryptI1() {
				intKey.decryptKey(this);
			}, h.sF(function symDecryptI2() {
				if (typeof ctext !== "object") {
					if (h.isHex(ctext)) {
						ctext = chelper.hex2bits(ctext);
					}

					ctext = {ct: ctext};
				} else {
					if (h.isHex(ctext.iv)) {
						ctext.iv = chelper.hex2bits(ctext.iv);
					}

					if (h.isHex(ctext.ct)) {
						ctext.ct = chelper.hex2bits(ctext.ct);
					}
				}

				if (iv) {
					if (h.isHex(iv)) {
						iv = chelper.hex2bits(iv);
					}
					ctext.iv = iv;
				}

				if (ctext.ct.length < 500) {
					this.ne(sjcl.decrypt(intKey.getSecret(), sjcl.json.encode(ctext), {raw: 1}));
				} else {
					sjclWorkerInclude.sym.decrypt(intKey.getSecret(), sjcl.json.encode(ctext), this);
				}
			}), h.sF(function (result) {
				this.ne(result);
			}), callback);
		}

		this.encrypt = encryptF;
		this.decrypt = decryptF;

		function encryptAndJsonifyF(text, callback, iv) {
			step(function () {
				encryptF(text, this, iv);
			}, h.sF(function (encrypted) {
				this.ne(JSON.stringify(encrypted));
			}), callback);
		}

		function decryptJsonifiedF(ctext, callback, iv) {
			decryptF(JSON.parse(ctext), callback, iv);
		}

		this.encryptAndJsonify = encryptAndJsonifyF;
		this.decryptJsonified = decryptJsonifiedF;
	};

	/** make a symkey out of keydata */
	function makeSymKey(keyData) {
		if (keyData && keyData.realid) {
			if (!symKeys[keyData.realid]) {
				var key = new SymKey(keyData);
				symKeys[keyData.realid] = key;
			}

			return symKeys[keyData.realid];
		}
	}

	function loadKeys(identifiers, cb) {
		step(function getKeyF() {
			var toLoadIdentifiers = [];

			identifiers.forEach(function (e) {
				if (!symKeys[e] && !cryptKeys[e] && !signKeys[e]) {
					toLoadIdentifiers.push(e);
				}
			});

			if (toLoadIdentifiers.length > 0) {
				socket.emit("key.getMultiple", {
					loaded: [],
					realids: identifiers
				}, this);
			} else {
				this.last.ne(identifiers);
			}
		}, h.sF(function () {
			this.ne(identifiers);
		}), cb);
	}

	var THROTTLE = 20;
	var delay = h.delayMultiple(THROTTLE, loadKeys);

	/** load a key and his keychain. remove loaded keys */
	function getKey(realKeyID, callback) {
		if (typeof realKeyID !== "string") {
			throw new Error("not a valid key realid: " + realKeyID);
		}

		console.info("loading key: " + realKeyID);

		delay(realKeyID, callback);
	}

	/** load  a symkey and its keychain */
	function symKeyGet(realKeyID, callback) {
		step(function checkLoaded() {
			if (symKeys[realKeyID]) {
				this.last.ne(symKeys[realKeyID]);
			} else {
				getKey(realKeyID, this);
			}
		}, h.sF(function returnKey() {
			if (symKeys[realKeyID]) {
				this.ne(symKeys[realKeyID]);
			} else {
				throw new errors.InvalidDataError("keychain not found");
			}
		}), callback);
	}

	/** generates a symmetric key
	* @param callback callback
	*/
	function symKeyGenerate(callback, comment) {
		step(function symGenI1() {
			this.ne(new SymKey());
		}, h.sF(function symGenI2(key) {
			if (!symKeys[key.getRealID()]) {
				symKeys[key.getRealID()] = key;
				newKeys.push(key);
				makeKeyUsableForEncryption(key.getRealID());

				key.setComment(comment);

				this.ne(symKeys[key.getRealID()]);
			} else {
				symKeyGenerate(this);
			}
		}), callback);
	}

	SymKey.get = symKeyGet;
	SymKey.generate = symKeyGenerate;

	/** a ecc crypto key
	* @param keyData keys data.
	*/
	CryptKey = function (keyData) {
		var publicKey, intKey, x, y, curve, point, realid, isPrivateKey = false, comment = "";

		if (!keyData || !keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid) {
			throw new errors.InvalidDataError("invalid data");
		}

		curve = chelper.getCurve(keyData.curve);

		x =	curve.field.fromBits(chelper.hex2bits(keyData.point.x));
		y = curve.field.fromBits(chelper.hex2bits(keyData.point.y));
		point = new sjcl.ecc.point(curve, x, y);

		publicKey = new sjcl.ecc.elGamal.publicKey(curve, point);

		realid = keyData.realid;

		if (keyData.exponent) {
			isPrivateKey = true;

			intKey = new Key(this, realid, keyData.decryptors, {
				secret: keyData.exponent,
				pastProcessor: toPrivateKey(sjcl.ecc.elGamal, curve)
			});
		} else if (keyData.decryptors) {
			isPrivateKey = true;
			intKey = new Key(this, realid, keyData.decryptors, {
				pastProcessor: toPrivateKey(sjcl.ecc.elGamal, curve)
			});
		} else {
			intKey = new Key(this, realid, []);
		}

		if (fingerPrintPublicKey(publicKey) !== intKey.getRealidFingerPrint()) {
			throw new errors.ValidationError("Fingerprint and Key id do not match");
		}

		this.getRealID = intKey.getRealID;

		if (isPrivateKey) {
			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getFastestDecryptor = intKey.getFastestDecryptor;

			this.getDecryptorsF = intKey.getDecryptors;

			this.addAsymDecryptor = intKey.addAsymDecryptor;
			this.addSymDecryptor = intKey.addSymDecryptor;
			this.addPWDecryptor = intKey.addPWDecryptor;

			this.getUploadData = function () {
				var p = publicKey._point, data = {
					realid: intKey.getRealID(),
					point: {
						x: chelper.bits2hex(p.x.toBits()),
						y: chelper.bits2hex(p.y.toBits())
					},
					curve: chelper.getCurveName(publicKey._curve),
					type: "crypt",
					decryptors: this.getDecryptorData(),
					comment: comment
				};

				return data;
			};

			this.setComment = function setCommentF(theComment) {
				if (theComment) {
					comment = theComment;
				}
			};

			this.getDecryptorData = intKey.getDecryptorData;
		}

		function getFingerPrintF() {
			return fingerPrintPublicKey(publicKey);
		}

		/** create a key 
		* param callback callback
		*/
		function kemF(callback) {
			if (!isKeyUsableForEncryption(intKey.getRealID())) {
				throw new errors.SecurityError("Key not usable for encryption: " + intKey.getRealID());
			}

			var resultKey;
			step(function () {
				this.ne(publicKey.kem());
			}, h.sF(function (keyData) {
				resultKey = new SymKey(keyData.key);
				symKeys[resultKey.getRealID()] = resultKey;
				newKeys.push(resultKey);
				makeKeyUsableForEncryption(resultKey.getRealID());
				resultKey.addAsymDecryptor(realid, keyData.tag, this);
			}), h.sF(function () {
				this.ne(resultKey.getRealID());
			}), callback);
		}

		/** unkem a key from a tag
		* @param tag the tag
		* @param callback callback
		*/
		function unkemF(tag, callback) {
			step(function () {
				if (!isPrivateKey) {
					this.last("not a private key");
				}

				intKey.decryptKey(this);
			}, h.sF(function () {
				console.info("slow decrypt");

				this.ne(intKey.getSecret().unkem(tag));
			}), callback);
		}

		this.getFingerPrint = getFingerPrintF;
		this.kem = kemF;

		if (isPrivateKey) {
			this.unkem = unkemF;
		}
	};

	/** make a crypt key out of keydata */
	function makeCryptKey(keyData) {
		if (keyData && keyData.realid) {
			if (!cryptKeys[keyData.realid]) {
				var key = new CryptKey(keyData);
				cryptKeys[keyData.realid] = key;
			}

			return cryptKeys[keyData.realid];
		}
	}

	/** get a crypt key
	* @param realKeyID keys real id
	* @param callback callback
	*/
	function cryptKeyGet(realKeyID, callback) {
		step(function checkLoaded() {
			if (cryptKeys[realKeyID]) {
				this.last.ne(cryptKeys[realKeyID]);
			} else {
				getKey(realKeyID);
			}
		}, h.sF(function keyGet() {
			if (cryptKeys[realKeyID]) {
				this.ne(cryptKeys[realKeyID]);
			} else {
				throw new errors.InvalidDataError("keychain not found");
			}
		}), callback);
	}

	function fingerPrintData(data) {
		return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(data));
	}

	function fingerPrintPublicKey(publicKey) {
		//should we add the type and curve here too?
		//as the curve is fixed for now it should not be a problem
		return fingerPrintData(publicKey._point.toBits());
	}

	function fingerPrintSymKey(keyData) {
		if (keyData instanceof Array) {
			return fingerPrintData(keyData);
		} else {
			throw new errors.InvalidDataError("invalid key data");
		}
	}

	/** generate a crypt key
	* @param curve curve to use
	* @param callback callback
	*/
	function cryptKeyGenerate(curve, callback, comment) {
		step(function cryptGenI1() {
			waitForReady(this);
		}, h.sF(function () {
			var curveO = chelper.getCurve(curve), key = sjcl.ecc.elGamal.generateKeys(curveO);
			this.ne(key.pub, key.sec);
		}), h.sF(function cryptGenI2(pub, sec) {
			/*jslint nomen: true*/
			var p = pub._point, data = {
				point: {
					x: chelper.bits2hex(p.x.toBits()),
					y: chelper.bits2hex(p.y.toBits())
				},
				exponent: sec._exponent.toBits(),
				realid: generateid(fingerPrintPublicKey(pub)),
				curve: chelper.getCurveName(pub._curve),
				comment: comment
			};
			/*jslint nomen: false*/

			var key = makeCryptKey(data);
			newKeys.push(key);

			key.setComment(comment);

			makeKeyUsableForEncryption(key.getRealID());

			this.ne(key);
		}), callback);
	}

	CryptKey.get = cryptKeyGet;
	CryptKey.generate = cryptKeyGenerate;

	/** a signature key
	* @param keyData sign key data
	*/
	SignKey = function (keyData) {
		var publicKey, intKey, x, y, curve, point, realid, isPrivateKey = false, comment = "";

		if (!keyData || !keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid) {
			throw new errors.InvalidDataError("invalid sign key data");
		}

		curve = chelper.getCurve(keyData.curve);

		x =	curve.field.fromBits(chelper.hex2bits(keyData.point.x));
		y = curve.field.fromBits(chelper.hex2bits(keyData.point.y));
		point = new sjcl.ecc.point(curve, x, y);

		publicKey = new sjcl.ecc.ecdsa.publicKey(curve, point);

		realid = keyData.realid;

		//add exponent/decryptors
		if (keyData.exponent) {
			isPrivateKey = true;

			intKey = new Key(this, realid, keyData.decryptors, {
				secret: keyData.exponent,
				pastProcessor: toPrivateKey(sjcl.ecc.ecdsa, curve)
			});
		} else if (keyData.decryptors) {
			isPrivateKey = true;
			intKey = new Key(this, realid, keyData.decryptors, {
				pastProcessor: toPrivateKey(sjcl.ecc.ecdsa, curve)
			});
		} else {
			intKey = new Key(this, realid, []);
		}

		if (fingerPrintPublicKey(publicKey) !== intKey.getRealidFingerPrint()) {
			throw new errors.ValidationError("Fingerprint and Key id do not match");
		}

		this.getRealID = intKey.getRealID;

		//add private key functions
		if (isPrivateKey) {
			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getRealID = intKey.getRealID;
			this.getDecryptorsF = intKey.getDecryptors;

			this.addAsymDecryptor = intKey.addAsymDecryptor;
			this.addSymDecryptor = intKey.addSymDecryptor;
			this.addPWDecryptor = intKey.addPWDecryptor;

			this.getUploadData = function () {
				var p = publicKey._point, data = {
					realid: intKey.getRealID(),
					point: {
						x: chelper.bits2hex(p.x.toBits()),
						y: chelper.bits2hex(p.y.toBits())
					},
					curve: chelper.getCurveName(publicKey._curve),
					type: "sign",
					decryptors: this.getDecryptorData(),
					comment: comment
				};

				return data;
			};

			this.getDecryptorData = intKey.getDecryptorData;

			this.setComment = function setCommentF(theComment) {
				if (theComment) {
					comment = theComment;
				}
			};
		}

		function getFingerPrintF() {
			return fingerPrintPublicKey(publicKey);
		}

		function signF(hash, callback, noCache) {
			var trustManager, signatureCache;
			step(function () {
				require(["crypto/trustManager", "crypto/signatureCache"], this.ne, this);
			}, h.sF(function (tM, _signatureCache) {
				trustManager = tM;
				signatureCache = _signatureCache;

				afterRequireCall(this);
			}), h.sF(function () {
				if (!trustManager.isLoaded) {
					trustManager.listen(this, "loaded");
				} else {
					this.ne();
				}
			}), h.sF(function () {
				if (!trustManager.hasKeyData(intKey.getRealID())) {
					console.log("key not in key database");
					throw new errors.SecurityError("key not in key database");
				}
				intKey.decryptKey(this);
			}), h.sF(function () {
				this.ne(intKey.getSecret().sign(hash));
			}), h.sF(function (signature) {
				if (signatureCache.isLoaded() && !noCache) {
					signatureCache.addSignatureStatus(signature, hash, realid, true);
				}

				this.ne(signature);
			}), callback);
		}

		function verifyF(signature, hash, callback) {
			var signatureCache, trustManager;
			step(function () {
				require(["crypto/trustManager", "crypto/signatureCache"], this.ne, this);
			}, h.sF(function (tM, sC) {
				signatureCache = sC;
				trustManager = tM;

				afterRequireCall(this);
			}), h.sF(function () {
				if (!trustManager.hasKeyData(intKey.getRealID())) {
					throw new errors.SecurityError("key not in key database");
				}

				if (signatureCache.isLoaded() && signatureCache.isSignatureInCache(signature, hash, realid)) {
					this.last.ne(signatureCache.getSignatureStatus(signature, hash, realid));
				} else {
					console.info("slow verify");
					console.time("verify");

					if (firstVerify) {
						firstVerify = false;
						this.ne(publicKey.verify(hash, signature));
					} else {
						sjclWorkerInclude.asym.verify(publicKey, signature, hash, this);
					}
				}
			}), h.sF(function (valid) {
				console.timeEnd("verify");
				if (signatureCache.isLoaded()) {
					signatureCache.addSignatureStatus(signature, hash, realid, valid);
				}

				this.ne(valid);
			}), callback);
		}

		if (isPrivateKey) {
			this.sign = signF;
		}

		this.getFingerPrint = getFingerPrintF;
		this.verify = verifyF;
	};

	/** make a sign key out of keydata */
	function makeSignKey(keyData) {
		if (keyData && keyData.realid) {
			if (!signKeys[keyData.realid]) {
				var key = new SignKey(keyData);
				signKeys[keyData.realid] = key;
			}

			return signKeys[keyData.realid];
		}
	}

	/** get a signature key
	* @param realKeyID the real id of the sign key
	* @param callback callback
	*/
	function signKeyGet(realKeyID, callback) {
		step(function checkLoaded() {
			if (signKeys[realKeyID]) {
				this.last.ne(signKeys[realKeyID]);
			} else {
				getKey(realKeyID);
			}
		}, h.sF(function keyGet() {
			if (signKeys[realKeyID]) {
				this.ne(signKeys[realKeyID]);
			} else {
				throw new errors.InvalidDataError("keychain not found");
			}
		}), callback);
	}

	/** generate a sign key
	* @param curve curve for the key
	* @param callback callback
	*/
	function signKeyGenerate(curve, callback, comment) {
		step(function signGenI1() {
			waitForReady(this);
		}, h.sF(function () {
			var curveO = chelper.getCurve(curve), key = sjcl.ecc.ecdsa.generateKeys(curveO);
			this.ne(key.pub, key.sec);
		}), h.sF(function signGenI2(pub, sec) {
			/*jslint nomen: true*/
			var p = pub._point, data = {
				point: {
					x: chelper.bits2hex(p.x.toBits()),
					y: chelper.bits2hex(p.y.toBits())
				},
				exponent: sec._exponent.toBits(),
				realid: generateid(fingerPrintPublicKey(pub)),
				curve: chelper.getCurveName(pub._curve)
			};
			/*jslint nomen: false*/

			var key = makeSignKey(data);
			newKeys.push(key);

			key.setComment(comment);

			this.ne(key);
		}), callback);
	}

	SignKey.get = signKeyGet;
	SignKey.generate = signKeyGenerate;

	/** make a key out of keyData. mainly checks type and calls appropriate function */
	makeKey = function makeKeyF(key) {
		if (key.type === "sym") {
			makeSymKey(key);
		} else if (key.type === "crypt") {
			makeCryptKey(key);
		} else if (key.type === "sign") {
			makeSignKey(key);
		} else {
			throw new errors.InvalidDataError("unknown key type");
		}
	};

	var verifyAllAttributesAreHashes = function (data) {
		var attr;
		for (attr in data) {
			if (data.hasOwnProperty(attr)) {
				if (typeof data === "object") {
					verifyAllAttributesAreHashes(data[attr]);
				} else if (typeof data !== "string" || data.substr(0, 6) !== "hash") {
					throw new errors.ValidationError("invalid hashobject");
				}
			}
		}
	};

	var ObjectHasher = function (data, keepDepth, verifyTree) {
		this._data = data;
		this._depth = keepDepth;
		this._verifyTree = verifyTree;
		this._hashedObject = {};
	};

	ObjectHasher.prototype.verifyHashStructure = function () {
		this._verifyTree = true;

		this.verifyAllAttributesAreHashes(this._data);

		this.hash();
	};

	ObjectHasher.prototype.sjclHash = function (data) {
		return "hash::" + chelper.bits2hex(sjcl.hash.sha256.hash(data));
	};

	ObjectHasher.prototype.getHashObject = function () {
		return this._hashedObject;
	};

	ObjectHasher.prototype._hashProperty = function (val) {
		return (this._verifyTree ? val : this.sjclHash("data::" + val.toString()));
	};

	ObjectHasher.prototype._doHashNewObject = function (val, attr) {
		var hasher = new ObjectHasher(val, this._depth-1, this._verifyTree);
		var result = hasher.hash();
		if (this._depth > 0) {
			this._hashedObject[attr] = hasher.getHashObject();
		}

		return result;
	};

	ObjectHasher.prototype._doHash = function (val, attr) {
		var allowedTypes = ["number", "string", "boolean"];

		if (attr === "hash") {
			if (!this._verifyTree) {
				throw new errors.InvalidDataError("object can not have hash attributes");
			}

			return;
		}

		var type = typeof val, result;
		if (type === "object") {
			result = this._doHashNewObject(val, attr);
		} else if (allowedTypes.indexOf(type) > -1) {
			result = this._hashProperty(val);
		} else {
			throw "can not hash objects with " + type;
		}

		if (!this._hashedObject[attr]) {
			this._hashedObject[attr] = result;
		}

		return result;
	};

	ObjectHasher.prototype._hashArray = function () {
		var i, result = [];
		for (i = 0; i < this._data.length; i += 1) {
			result.push(this._doHash(this._data[i]), i);
		}

		return this.sjclHash(JSON.stringify(result));
	};

	ObjectHasher.prototype._jsonifyUnique = function (obj) {
		var sortation = Object.keys(obj).sort();
		return JSON.stringify(obj, sortation);
	};

	ObjectHasher.prototype._hashObject = function () {
		var attr, hashObj = {};
		for (attr in this._data) {
			if (this._data.hasOwnProperty(attr)) {
				hashObj[attr] = this._doHash(this._data[attr], attr);
			}
		}

		return this.sjclHash(this._jsonifyUnique(hashObj));
	};

	ObjectHasher.prototype._hashData = function () {
		if (this._data instanceof Array) {
			return this._hashArray();
		} else {
			return this._hashObject();
		}
	};

	ObjectHasher.prototype.hash = function() {
		if (typeof this._data !== "object") {
			throw new errors.InvalidDataError("this is not an object!");
		}

		var result = this._hashData();

		if (this._verifyTree && result !== this._data.hash) {
			throw new errors.ValidationError("verifyTree failed");
		}

		this._hashedObject.hash = result;
		return result;
	};

	ObjectHasher.prototype.hashBits = function () {
		var result = this.hash();
		return chelper.hex2bits(result.substr(6));
	};

	var ObjectPadder = function (obj, minLength) {
		this._obj = obj;
		this._minLength = minLength;
	};

	ObjectPadder.prototype._padObject = function (val, cb) {
		var that = this;
		step(function () {
			var attr;
			for (attr in val) {
				if (val.hasOwnProperty(attr)) {
					var padder = new ObjectPadder(val[attr], that._minLength);
					padder.pad(this.parallel());
				}
			}

			this.parallel()();
		}, h.sF(function (padded) {
			var attr, count = 0, result = {};
			for (attr in val) {
				if (val.hasOwnProperty(attr)) {
					result[attr] = padded[count];
					count += 1;
				}
			}

			this.ne(result);
		}), cb);
	};

	ObjectPadder.prototype._padArray = function (val, cb) {
		var that = this;
		step(function () {
			var i;
			for (i = 0; i < val.length; i += 1) {
				var padder = new ObjectPadder(val[i], that._minLength);
				padder.pad(this.parallel());
			}

			this.parallel()();
		}, h.sF(function (padded) {
			var i, result = [];
			if (padded) {
				for (i = 0; i < padded.length; i += 1) {
					result[i] = padded[i];
				}
			}

			this.ne(result);
		}), cb);
		//this._data instanceof Array
	};

	ObjectPadder.prototype._padString = function (val, cb) {
		var that = this;

		step(function () {
			var length = that._minLength-(val.length%that._minLength) + that._minLength;
			keyStore.random.hex(length, this);
		}, h.sF(function (rand) {
			this.ne(rand + "::" + val);
		}), cb);
	};

	ObjectPadder.prototype._padAttribute = function (attr, cb) {
		var type = typeof attr;
		if (type === "object") {
			if (attr instanceof Array) {
				this._padArray(attr, cb);
			} else {
				this._padObject(attr, cb);
			}
		} else if (type === "string") {
			this._padString(attr, cb);
		} else {
			throw new errors.InvalidDataError("could not pad value of type " + type);
		}
	};

	ObjectPadder.prototype.pad = function (cb) {
		this._padAttribute(this._obj, cb);
	};

	ObjectPadder.prototype._unpadObject = function (val) {
		var attr, result = {};
		for (attr in val) {
			if (val.hasOwnProperty(attr)) {
				var padder = new ObjectPadder(val[attr], this._minLength);
				result[attr] = padder.unpad();
			}
		}

		return result;
	};

	ObjectPadder.prototype._unpadString = function (val) {
		if (val.length%this._minLength !== 2) {
			throw new errors.InvalidDataError("padding size invalid");
		}

		var paddingIndex = val.indexOf("::");

		if (paddingIndex === -1) {
			throw new errors.InvalidDataError("no padding seperator found");
		}

		return val.substr(paddingIndex + 2);
	};

	ObjectPadder.prototype._unpadArray = function (val) {
		var result = [], i;
		for (i = 0; i < val.length; i += 1) {
			var padder = new ObjectPadder(val[i], this._minLength);
			result[i] = padder.unpad();
		}

		return result;
	};

	ObjectPadder.prototype._unpadAttribute = function (attr) {
		var type = typeof attr;
		if (type === "object") {
			if (attr instanceof Array) {
				return this._unpadArray(attr);
				//TODO!
			} else {
				return this._unpadObject(attr);
			}
		} else if (type === "string") {
			return this._unpadString(attr);
		} else {
			throw new errors.InvalidDataError("could not pad value of type " + type);
		}
	};

	ObjectPadder.prototype.unpad = function () {
		return this._unpadAttribute(this._obj);
	};

	var ObjectCryptor = function (key, depth, object) {
		this._key = key;
		this._depth = depth;
		this._object = object;
	};

	ObjectCryptor.prototype.encryptAttr = function (cur, cb) {
		if (typeof cur === "object") {
			new ObjectCryptor(this._key, this._depth-1, cur).encrypt(cb);
		} else if (typeof cur === "string" || typeof cur === "number" || typeof cur === "boolean") {
			this._key.encryptWithPrefix("data::", cur.toString(), cb);
		} else {
			throw new errors.InvalidDataError("Invalid encrypt!");
		}
	};

	ObjectCryptor.prototype.encryptObject = function (cb) {
		var that = this;
		step(function encryptAllAttributes() {
			var attr;
			for (attr in that._object) {
				if (that._object.hasOwnProperty(attr) && attr !== "key") {
					that.encryptAttr(that._object[attr], this.parallel());
				}
			}

			this.parallel()();
		}, h.sF(function (encrypted) {
			var attr, resultObject = {}, count = 0;
			for (attr in that._object) {
				if (that._object.hasOwnProperty(attr) && attr !== "key") {
					resultObject[attr] = encrypted[count];
					count += 1;
				}
			}

			this.ne(resultObject);
		}), cb);
	};

	ObjectCryptor.prototype.encryptJSON = function (cb) {
		this._key.encryptWithPrefix("json::", JSON.stringify(this._object), cb);
	};

	ObjectCryptor.prototype.encrypt = function (cb) {
		if (this._depth > 0) {
			this.encryptObject(cb);
		} else {
			this.encryptJSON(cb);
		}
	};

	ObjectCryptor.prototype.decryptCorrectObject = function (obj) {
		if (typeof obj === "object" && !(obj instanceof Array)) {
			return obj;
		} else {
			obj = sjcl.codec.utf8String.fromBits(obj);

			var prefix = obj.substr(0, 6);
			var content = obj.substr(6);

			if (prefix === "data::") {
				return content;
			} else if (prefix === "json::") {
				return JSON.parse(content);
			} else {
				throw new errors.ValidationError();
			}
		}
	};

	ObjectCryptor.prototype.decryptAttr = function (cur, cb) {
		if (cur.iv && cur.ct) {
			this._key.decrypt(cur, cb);
		} else {
			new ObjectCryptor(this._key, this._depth-1, cur).decrypt(cb);
		}
	};

	ObjectCryptor.prototype._decryptEndAttribute = function (cb) {
		var that = this;
		step(function () {
			that._key.decrypt(that._object, this);
		}, h.sF(function (result) {
			this.ne(that.decryptCorrectObject(result));
		}), cb);
	};

	ObjectCryptor.prototype._decryptPartialObjects = function (cb) {
		var that = this;
		step(function () {
			var attr;
			for (attr in that._object) {
				if (that._object.hasOwnProperty(attr) && attr !== "key") {
					new ObjectCryptor(that._key, that._depth-1, that._object[attr]).decrypt(this.parallel());
				}
			}
			this.parallel()();
		}, h.sF(function (decrypted) {
			var attr, count = 0, resultObject = {};
			for (attr in that._object) {
				if (that._object.hasOwnProperty(attr) && attr !== "key") {
					resultObject[attr] = decrypted[count];
					count+=1;
				}
			}

			this.ne(resultObject);
		}), cb);
	};

	ObjectCryptor.prototype.decrypt = function (cb) {
		if (this._depth < 0) {
			throw new errors.DecryptionError("invalid decryption depth!");
		}

		if (this._object.iv && this._object.ct) {
			this._decryptEndAttribute(cb);
		} else {
			this._decryptPartialObjects(cb);
		}
	};

	/** our interface */
	keyStore = {
		reset: function reset() {
			dirtyKeys = [];
			newKeys = [];

			keyGenIdentifier = "";

			symKeys = {};
			cryptKeys = {};
			signKeys = {};

			mainKey = undefined;

			password = "";
			keysUsableForEncryption = [];
			firstVerify = true;
		},

		setAfterRequireCall: function (cb) {
			afterRequireCall = cb;
		},

		setKeyGenIdentifier: function (identifier) {
			keyGenIdentifier = identifier;
			//TODO: update all key identifiers for all keys.
		},

		getKeyGenIdentifier: function () {
			return keyGenIdentifier;
		},

		correctKeyIdentifier: function correctKeyIdentifierF(realid) {
			return correctKeyIdentifier(realid);
		},

		addImprovementListener: function (listener) {
			improvementListener.push(listener);
		},

		security: {
			addEncryptionIdentifier: function (realid) {
				makeKeyUsableForEncryption(realid);
			},

			setPassword: function (pw) {
				password = pw;

				if (localStorage) {
					localStorage.setItem("password", password);
				}
			},

			verifyWithPW: function (data, expectedResult) {
				//decrypt data with pw
				var result = sjcl.decrypt(password, chelper.Object2sjclPacket(data));
				//unpad data
				result = new ObjectPadder(JSON.parse(result), 128).unpad();

				//check with expectedresult
				if (!h.deepEqual(expectedResult, result)) {
					throw new errors.SecurityError("verify with pw failed");
				}
			},

			makePWVerifiable: function (data, pw, cb) {
				step(function () {
					//pad data
					new ObjectPadder(data, 128).pad(this);
				}, h.sF(function (paddedData) {
					//encrypt with pw
					encryptPW(pw, JSON.stringify(paddedData), this);
				}), cb);
			}
		},

		format: {
			base64ToBits: function (base64) {
				return sjcl.codec.base64.toBits(base64);
			},
			bitsToBase64: function (bits) {
				return sjcl.codec.base64.fromBits(bits);
			},
			fingerPrint: function (keyID) {
				var hex = keyID.split(":")[1];
				return sjcl.codec.base32.fromBits(sjcl.codec.hex.toBits(hex));
			},
			unformat: function (str, start) {
				if (str.indexOf(start + "::") !== 0) {
					throw new errors.InvalidDataError("format invalid");
				}

				return str.substr(start.length + 2);
			}
		},

		hash: {
			addPaddingToObject: function (obj, minLength, cb) {
				minLength = minLength || 128;

				new ObjectPadder(obj, minLength).pad(cb);
			},
			removePaddingFromObject: function (obj, padLength) {
				padLength = padLength || 128;
				return new ObjectPadder(obj, padLength).unpad();
			},
			hash: function (text) {
				return chelper.bits2hex(sjcl.hash.sha256.hash(text));
			},

			hashBigBase64CodedData: function (text, cb) {
				//TODO: move to worker
				var i, h = new sjcl.hash.sha256(), PART = 4 * 50;
				for (i = 0; i < text.length / PART; i+= 1) {
					h.update(sjcl.codec.base64.toBits(text.substr(i*PART, PART)));
				}

				cb(null, chelper.bits2hex(h.finalize()));
			},

			hashPW: function (pw) {
				return chelper.bits2hex(sjcl.hash.sha256.hash(pw)).substr(0, 10);
			},

			deepHashObject: function (obj) {
				var hasher = new ObjectHasher(obj);
				hasher.hash();
				return hasher.getHashObject();
			},

			hashObjectOrValueHex: function (val) {
				if (typeof val === "object") {
					return new ObjectHasher(val).hash();
				} else {
					return "hash::" + chelper.bits2hex(sjcl.hash.sha256.hash("data::" + val));
				}
			},

			hashObject: function (obj) {
				return new ObjectHasher(obj).hashBits();
			},

			hashObjectHex: function (obj) {
				return new ObjectHasher(obj).hash();
			},
		},

		upload: {
			addKey: function (keyData) {
				if (h.isRealID(keyData.realid)) {
					makeKey(keyData);
				}

				return keyData.realid;
			},
			getKeyAccessCount: function (keyrealid) {
				var key = symKeys[keyrealid];
				if (key) {
					return key.getAccessCount();
				}

				return -1;
			},
			setSocket: function (theSocket) {
				socket = theSocket;
			},
			getKey: function (keyid) {
				var i;
				for (i = 0; i < newKeys.length; i += 1) {
					if (keyid === newKeys[i].getRealID()) {

						return newKeys[i].getUploadData();
					}
				}
			},
			getKeys: function (keys) {
				var addKeys = [];
				var i;
				for (i = 0; i < newKeys.length; i += 1) {
					if (keys.indexOf(newKeys[i].getRealID()) > -1) {
						addKeys.push(newKeys[i].getUploadData());
					}
				}

				return addKeys;
			},
			getDecryptors: function (allowed, allowedEncryptors) {
				var addKeyDecryptors = {};

				var i, j, decryptors, encryptorFilter;
				for (i = 0; i < dirtyKeys.length; i += 1) {
					if (allowed.indexOf(dirtyKeys[i].getRealID()) !== -1) {
						decryptors = dirtyKeys[i].getDecryptorData();
						
						if (allowedEncryptors) {
							encryptorFilter = [];
							for (j = 0; j < decryptors.length; j += 1) {
								if (allowedEncryptors.indexOf(decryptors[j].decryptorid) !== -1) {
									encryptorFilter.push(decryptors[j]);
								}
							}

							decryptors = encryptorFilter;
						}

						addKeyDecryptors[dirtyKeys[i].getRealID()] = decryptors;
					}
				}

				return addKeyDecryptors;
			},
			uploaded: function (data) {
				/*
				{
					keys: {
						realid1: realid1,
						realid2: realid2,
						realid3: realid3,
						...
					},
					decryptors: {
						realid1: data
					}
				}
				*/
				var realid;
				for (realid in data.decryptors) {
					if (data.decryptors.hasOwnProperty(realid)) {
						getKey(realid).removeDirty(data.decryptors[realid]);
					}
				}

				var remainedKeys = [];

				var i;
				for (i = 0; i < newKeys.length; i += 1) {
					realid = newKeys[i].getRealID();

					if (!data.keys[realid]) {
						remainedKeys.push(newKeys[i]);
					}
				}

				newKeys = remainedKeys;
			}
		},

		random: {
			hex: function (length, cb) {
				step(function () {
					waitForReady(this);
				}, h.sF(function () {
					var res = chelper.bits2hex(sjcl.random.randomWords(Math.ceil(length/8)));
					this.ne(res.substr(0, length));
				}), cb);
			},
			words: function (number, cb) {
				step(function () {
					waitForReady(this);
				}, h.sF(function () {
					this.ne(sjcl.random.randomWords(number));
				}), cb);
			}
		},

		sym: {
			registerMainKey: function (_mainKey) {
				mainKey = _mainKey;
			},

			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback, comment) {
				step(function symGen1() {
					waitForReady(this);
				}, h.sF(function () {
					SymKey.generate(this, comment);
				}), h.sF(function symGen2(key) {
					var r = key.getRealID();

					this.ne(r);
				}), callback);
			},

			/** encrypt key with sym key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			symEncryptKey: function symEncryptKeyF(realID, parentKeyID, callback) {
				step(function () {
					SymKey.get(realID, this);
				}, h.sF(function (key) {
					key.addSymDecryptor(parentKeyID, this);
				}), callback);
			},

			/** encrypt this key with an asymmetric key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			asymEncryptKey: function asymEncryptKeyF(realID, parentKeyID, callback) {
				var symKey;
				step(function asymEncr1() {
					SymKey.get(realID, this);
				}, h.sF(function asymEncr2(key) {
					symKey = key;
					CryptKey.get(parentKeyID, this);
				}), h.sF(function asymEncr3(key) {
					key.kem(this);
				}), h.sF(function asymEncr4(parentRealID) {
					keyStore.sym.symEncryptKey(realID, parentRealID, this);
				}), callback);
			},

			/** encrypt key with password
			* @param realID key to encrypt
			* @param password password to encrypt with
			* @param callback callback
			*/
			pwEncryptKey: function pwEncryptKeyF(realID, password, callback) {
				step(function () {
					SymKey.get(realID, this);
				}, h.sF(function (key) {
					key.addPWDecryptor(password, this);
				}), callback);
			},

			/** encrypt text with this key.
			* @param text text to encrypt
			* @param realKeyID key to encrypt with
			* @param callback callback
			*/
			encryptText: function (text, realKeyID, callback) {
				step(function symEncrypt1() {
					SymKey.get(realKeyID, this);
				}, h.sF(function symEncrypt2(key) {
					key.encryptWithPrefix("data::", text, this);
				}), h.sF(function symEncrypt3(ct) {
					this.ne(ct);
				}), callback);
			},

			/** encrypt an object
			* @param object Object to encrypt
			* @param realKeyID key to encrypt with
			* @param callback callback
			*/
			encryptObject: function (object, realKeyID, depth, callback) {
				step(function objEncrypt1() {
					if (object.iv) {
						throw new errors.InvalidDataError("IV already set.");
					}

					SymKey.get(realKeyID, this);
				}, h.sF(function objEncrypt2(key) {
					new ObjectCryptor(key, depth, object).encrypt(this);
				}), h.sF(function (result) {
					this.ne(result);
				}), callback);
			},

			decryptObject: function (cobject, depth, callback, key) {
				step(function objDecrypt1() {
					SymKey.get(key || mainKey, this);
				}, h.sF(function objDecrypt2(key) {
					new ObjectCryptor(key, depth, cobject).decrypt(this);
				}), h.sF(function objDecrypt3(result) {
					this.ne(result);
				}), callback);
			},

			/** decrypt an encrypted text
			* @param ctext text to decrypt
			* @param realKeyID key to decrypt with
			* @param callback callback
			*/
			decryptText: function (ctext, realKeyID, callback) {
				step(function () {
					SymKey.get(realKeyID, this);
				}, h.sF(function (key) {
					key.decrypt(ctext, this);
				}), h.sF(function (decryptedData) {
					this.ne(sjcl.codec.utf8String.fromBits(removeExpectedPrefix(decryptedData, "data::")));
				}), callback);
			},

			encryptBigBase64: function (bin, realKeyID, callback) {
				step(function symEncrypt1() {
					SymKey.get(realKeyID, this);
				}, h.sF(function symEncrypt2(key) {
					key.encryptWithPrefix("bin::", bin, this);
				}), h.sF(function (result) {
					this.ne(sjcl.codec.base64.fromBits(sjcl.codec.hex.toBits(result.iv + result.ct)));
				}), callback);
			},

			decryptBigBase64: function (bin, realKeyID, callback) {
				step(function () {
					SymKey.get(realKeyID, this);
				}, h.sF(function (key) {
					bin = sjcl.codec.base64.toBits(bin);

					var decr = {
						iv: sjcl.bitArray.bitSlice(bin, 0, 32*4),
						ct: sjcl.bitArray.bitSlice(bin, 32*4)
					};

					key.decrypt(decr, this);
				}), h.sF(function (decryptedData) {
					this.ne(removeExpectedPrefix(decryptedData, "bin::"));
				}), callback);
			}
		},

		asym: {
			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback, comment) {
				step(function cryptGen1() {
					CryptKey.generate("256", this, comment);
				}, h.sF(function cryptGen2(key) {
					var r = key.getRealID();

					this.ne(r);
				}), callback);
			},

			/** encrypt key with sym key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			symEncryptKey: function symEncryptKeyF(realID, parentKeyID, callback) {
				step(function () {
					CryptKey.get(realID, this);
				}, h.sF(function (key) {
					key.addSymDecryptor(parentKeyID, this);
				}), callback);
			},

			/** encrypt key with password
			* @param realID key to encrypt
			* @param password password to encrypt with
			* @param callback callback
			*/
			pwEncryptKey: function pwEncryptKeyF(realID, password, callback) {
				step(function () {
					CryptKey.get(realID, this);
				}, h.sF(function (key) {
					key.addPWDecryptor(password, this);
				}), callback);
			},

			fingerPrintKey: function (realID, cb) {
				step(function () {
					CryptKey.get(realID, this);
				}, h.sF(function (key) {
					this.ne(key.getFingerPrint());
				}), cb);
			}
		},

		sign: {
			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback, comment) {
				step(function signGen1() {
					SignKey.generate("256", this, comment);
				}, h.sF(function signGen2(key) {
					var r = key.getRealID();

					this.ne(r);
				}), callback);
			},

			/** encrypt key with sym key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			symEncryptKey: function symEncryptKeyF(realID, parentKeyID, callback) {
				step(function () {
					SignKey.get(realID, this);
				}, h.sF(function (key) {
					key.addSymDecryptor(parentKeyID, this);
				}), callback);
			},

			/** encrypt key with password
			* @param realID key to encrypt
			* @param password password to encrypt with
			* @param callback callback
			*/
			pwEncryptKey: function pwEncryptKeyF(realID, password, callback) {
				step(function () {
					SignKey.get(realID, this);
				}, h.sF(function (key) {
					key.addPWDecryptor(password, this);
				}), callback);
			},

			/** sign a given text
			* @param text text to sign
			* @param realID key id with which to sign
			* @param callback callback
			*/
			signText: function (text, realID, callback, noCache) {
				keyStore.sign.signHash(sjcl.hash.sha256.hash(text), realID, callback, noCache);
			},

			/** sign a hash
			* @param hash hash to sign
			* @param realID key id with which to sign
			* @param callback callback
			*/
			signHash: function (hash, realID, callback, noCache) {
				step(function () {
					hash = chelper.hex2bits(hash);

					SignKey.get(realID, this);
				}, h.sF(function (key) {
					key.sign(hash, this, noCache);
				}), h.sF(function (signature) {
					this.ne(chelper.bits2hex(signature));
				}), callback);
			},

			signObject: function signObjectF(object, realID, callback, noCache) {
				step(function signO1() {
					var hash = new ObjectHasher(object, 0).hashBits();
					keyStore.sign.signHash(hash, realID, this, noCache);
				}, callback);
			},

			/** verify a given text
			* @param signature given signature
			* @param text given text
			* @param realID key to verify against
			* @param callback callback
			*/
			verifyText: function (signature, text, realID, callback) {
				keyStore.sign.verifyHash(signature, sjcl.hash.sha256.hash(text), realID, callback);
			},

			verifyObject: function signObjectF(signature, object, realID, callback) {
				step(function signO1() {
					var hash = new ObjectHasher(object, 0).hashBits();
					keyStore.sign.verifyHash(signature, hash, realID, this);
				}, callback);
			},

			/** verify a given hash
			* @param signature given signature
			* @param hash given hash
			* @param realID key to verify against
			* @param callback callback
			*/
			verifyHash: function (signature, hash, realID, callback) {
				step(function () {
					hash = chelper.hex2bits(hash);
					signature = chelper.hex2bits(signature);

					SignKey.get(realID, this);
				}, h.sF(function (key) {
					key.verify(signature, hash, this);
				}), function (e, correct) {
					if (e) {
						this.ne(false);
					} else {
						this.ne(correct);
					}
				}, callback);
			},

			fingerPrintKey: function (realID, cb) {
				step(function () {
					CryptKey.get(realID, this);
				}, h.sF(function (key) {
					this.ne(key.getFingerPrint());
				}), cb);
			}
		}
	};

	return keyStore;
});