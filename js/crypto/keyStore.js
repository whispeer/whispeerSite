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
define(["step", "helper", "crypto/helper", "libs/sjcl", "crypto/sjclWorkerInclude"], function (step, h, chelper, sjcl) {
	"use strict";
	var dirtyKeys = [], newKeys = [], symKeys = {}, cryptKeys = {}, signKeys = {}, passwords = [], keyGenIdentifier = "", Key, SymKey, CryptKey, SignKey, makeKey, keyStore;

	var MAXSPEED = 99999999999, SPEEDS = {
		symKey: {
			loaded: 3,
			unloaded: 50
		},
		asymKey: {
			loaded: 100,
			unloaded: 150
		},
		pw: 3
	};

	//TODO: webworkers: 
	var webWorker = Modernizr.webworkers;

	/** generate an id */
	function generateid() {
		var id = keyGenIdentifier + ":" + chelper.bits2hex(sjcl.hash.sha256.hash(new Date().getTime()));

		if (symKeys[id] || cryptKeys[id] || signKeys[id]) {
			return generateid();
		}

		return id;
	}

	/** encrypt a password
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

	/** which keys are already loaded. (only decryption keys) */
	function loadedKeys() {
		return Object.keys(symKeys).concat(Object.keys(cryptKeys));
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
				}), h.sF(function (text) {
					if (text.substr(0, 5) === "key::") {
						this.ne(text.substr(5));
					} else {
						throw "not a key!";
					}
				}), callback);
			} else if (decryptortype === "asymKey") {
				step(function () {
					CryptKey.get(decryptorid, this);
				}, h.sF(function (theKey) {
					cryptor = theKey;
					theKey.decryptKey(this);
				}), h.sF(function () {
					cryptor.unkem(ctext, this);
				}), callback);
			} else if (decryptortype === "pw") {
				step(function () {
					var jsonData = sjcl.json.encode({
						ct: chelper.bits2hex(ctext),
						iv: chelper.bits2hex(iv),
						salt: salt
					}), i, result;
					for (i = 0; i < passwords.length; i += 1) {
						try {
							result = sjcl.decrypt(passwords[i], jsonData);
							this.ne(result);
							break;
						} catch (e) {}
					}

					throw "no pw";
				}, h.sF(function (text) {
					if (text.substr(0, 5) === "key::") {
						this.ne(text.substr(5));
					} else {
						throw "not a key!";
					}
				}), callback);
			} else {
				throw "invalid decryptortype";
			}
		}, callback);
	}

	/** returns a decryptors object if loaded
	* @param decryptorData
	* @return decryptorObject or null
	*/
	function getDecryptor(decryptorData) {
		if (decryptorData.type === "symKey") {
			return symKeys[decryptorData.id];
		}

		if (decryptorData.type === "asymKey") {
			return cryptKeys[decryptorData.id];
		}

		return null;
	}

	/** general key object.
	* @param realid keys real id
	* @param decryptors array of decryptor data
	* @param optional secret unencrypted secret if we already have it
	*/
	Key = function keyConstructor(superKey, realid, decryptors, optionals) {
		var theKey = this, decrypted = false, dirtyDecryptors = [], internalSecret;

		if (!decryptors) {
			decryptors = [];
		}

		/** identity past processor */
		function pastProcessor(secret, callback) {
			callback(null, secret);
		}

		optionals = optionals || {};

		if (optionals.secret) {
			internalSecret = optionals.secret;
			decrypted = true;
		}

		if (typeof optionals.pastProcessor === "function") {
			pastProcessor = optionals.pastProcessor;
		}

		/** is the key decrypted */
		function decryptedF() {
			return decrypted;
		}

		/** decrypt this key.
		* @param callback called with true/false
		* searches your whole keyspace for a decryptor and decrypts if possible
		*/
		function decryptKeyF(callback) {
			var usedDecryptor;
			step(function () {
				if (decrypted) {
					this.last.ne(true);
					return;
				}

				usedDecryptor = theKey.getFastestDecryptor();

				if (!usedDecryptor) {
					this.last.ne(false);
					return;
				}

				internalDecrypt(usedDecryptor.decryptorid, usedDecryptor.decryptortype, usedDecryptor.ct, this, usedDecryptor.iv, usedDecryptor.salt);
			}, function (err, result) {
				if (err || result === false) {
					var i;
					for (i = 0; i < decryptors.length; i += 1) {
						if (decryptors[i] === usedDecryptor) {
							decryptors.splice(i, 1);
						}
					}

					theKey.decryptKey(this.last);
				} else {
					pastProcessor(result, this);
				}
			}, h.sF(function (pastProcessedSecret) {
				internalSecret = pastProcessedSecret;
				decrypted = true;
				this.ne(true);
			}), callback);
		}
		this.decrypted = decryptedF;
		this.decryptKey = decryptKeyF;


		/** getter for real id */
		function getRealIDF() {
			var parts = realid.split(":");

			if (parts.length !== 2) {
				throw "This should not happen!";
			}

			if (parts[0].length === 0) {
				return keyGenIdentifier + ":" + parts[1];
			}

			return realid;
		}
		this.getRealID = getRealIDF;

		/** getter for decryptors array
		* copies array before returning
		*/
		function getDecryptorsF() {
			var result, i, tempR, k;
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
				curSpeeds = SPEEDS[cur.decryptortype];

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
							subKeyData = key.getFastestDecryptorSpeed(level + 1);
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
					decryptorid: 0,
					type: "asymKey",
					id: realid,
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
			}, h.sF(function addSymD2(theKey) {
				cryptor = theKey;
				theKey.decryptKey(this);
			}), h.sF(function addSymD3() {
				cryptor.encrypt("key::" + internalSecret, this);
			}), h.sF(function addSymD4(data) {
				var decryptorData = {
					decryptorid: 0,
					type: "symKey",
					id: realid,
					ct: chelper.bits2hex(data.ct),
					iv: chelper.bits2hex(data.iv),
					dirty: true
				};

				decryptors.push(decryptorData);
				dirtyKeys.push(superKey);
				dirtyDecryptors.push(decryptorData);

				this.ne();
			}), callback);
		}

		/** add a pw decryptor
		* @param pw password
		* @param callback callback
		*/
		function addPWDecryptorF(pw, callback) {
			step(function () {
				encryptPW(pw, internalSecret, this);
			}, h.sF(function (data) {
				var decryptorData = {
					decryptorid: 0,
					type: "pw",
					//Think, shortHash here? id: ?,
					ct: chelper.bits2hex(data.ct),
					iv: chelper.bits2hex(data.iv),
					salt: data.salt,
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
			var result = [], i, tempR, k, parts;
			for (i = 0; i < dirtyDecryptors.length; i += 1) {
				tempR = {};
				for (k in dirtyDecryptors[i]) {
					if (dirtyDecryptors[i].hasOwnProperty(k)) {
						tempR[k] = dirtyDecryptors[i][k];
					}
				}

				parts = tempR.id.split(":");

				if (parts.length !== 2) {
					throw "This should not happen!";
				}

				if (parts[0].length === 0) {
					tempR.id = keyGenIdentifier + ":" + parts[1];
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
			if (decrypted) {
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
		var intKey;

		if (keyData) {
			if (typeof keyData === "string") {
				intKey = new Key(this, generateid(), [], {secret: chelper.hex2bits(keyData)});
			} else if (keyData instanceof Array) {
				intKey = new Key(this, generateid(), [], {secret: keyData});
			} else {
				intKey = new Key(this, keyData.realid, keyData.decryptors);
			}
		} else {
			intKey = new Key(this, generateid(), [], {secret: sjcl.random.randomWords(8)});
		}

		this.getFullUploadData = function () {
			var data = {
				realid: intKey.getRealID(),
				decryptor: intKey.getDecryptorData()
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

		/** encrypt a text.
		* @param text text to encrypt
		* @param callback called with result
		* @param optional iv initialization vector
		*/
		function encryptF(text, callback, iv) {
			step(function symEncryptI1() {
				if (!intKey.decrypted()) {
					throw "not yet decrypted";
				}

				var result;
				if (iv) {
					result = sjcl.encrypt(intKey.getSecret(), text, {"iv": iv});
				} else {
					result = sjcl.encrypt(intKey.getSecret(), text);
				}

				this.ne(chelper.sjclPacket2Object(result));
			}, callback);
		}

		/** decrypt some text.
		* @param ctext text to decrypt
		* @param callback called with results
		* @param optional iv initialization vector
		*/
		function decryptF(ctext, callback, iv) {
			step(function () {
				if (!intKey.decrypted()) {
					throw "not yet decrypted";
				}

				var result;

				if (typeof ctext !== "object") {
					ctext = {ct: ctext};
				}

				if (iv) {
					ctext.iv = iv;
				}

				result = sjcl.decrypt(intKey.getSecret(), sjcl.json.encode(ctext));

				this.ne(result);
			}, callback);
		}

		this.encrypt = encryptF;
		this.decrypt = decryptF;
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

	/** load a key and his keychain. remove loaded keys */
	function getKey(realKeyID, callback) {
		step(function getKeyF() {
			h.get({
				keychain: {
					loaded: loadedKeys(),
					realid: realKeyID
				}
			}, this);
		}, h.sF(function keyChain(data) {
			var keys = data.keychain, i;
			for (i = 0; i < keys.length; i += 1) {
				h.isRealID(keys[i].realid);
				makeKey(keys[i]);
			}

			this.ne();
		}), callback);
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
				throw "keychain not found";
			}
		}), callback);
	}

	/** generates a symmetric key
	* @param callback callback
	*/
	function symKeyGenerate(callback) {
		step(function symGenI1() {
			this.ne(new SymKey());
		}, h.sF(function symGenI2(key) {
			if (!symKeys[key.getRealID()]) {
				symKeys[key.getRealID()] = key;
				newKeys.push(key);

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
		var publicKey, intKey, x, y, curve, point, realid, isPrivateKey = false;

		if (!keyData || !keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid) {
			throw "invalid data";
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
				postProcessor: function cryptKeyPostProcessor(secret, callback) {
					step(function () {
						var exponent = new sjcl.bn(secret);

						this.ne(new sjcl.ecc.elGamal.privateKey(curve, exponent));
					}, callback);
				}
			});
		} else if (keyData.decryptors) {
			isPrivateKey = true;
			intKey = new Key(this, realid, keyData.decryptors, {
				postProcessor: function cryptKeyPostProcessor(secret, callback) {
					step(function () {
						var exponent = new sjcl.bn(secret);

						this.ne(new sjcl.ecc.elGamal.privateKey(curve, exponent));
					}, callback);
				}
			});
		}

		this.getRealID = intKey.getRealID;

		if (isPrivateKey) {
			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getDecryptorsF = intKey.getDecryptors;

			this.addAsymDecryptor = intKey.addAsymDecryptor;
			this.addSymDecryptor = intKey.addSymDecryptor;
			this.addPWDecryptor = intKey.addPWDecryptor;

			this.getFullUploadData = function () {
				var p = publicKey._point, data = {
					realid: intKey.getRealID(),
					point: {
						x: chelper.bits2hex(p.x.toBits()),
						y: chelper.bits2hex(p.y.toBits())
					},
					curve: chelper.getCurveName(publicKey._curve),
					decryptor: intKey.getDecryptorData()
				};

				return data;
			};

			this.getDecryptorData = intKey.getDecryptorData;
		}

		/** create a key 
		* param callback callback
		*/
		function kemF(callback) {
			var resultKey;
			step(function () {
				this.ne(publicKey.kem());
			}, h.sF(function (keyData) {
				resultKey = new SymKey(keyData.key);
				symKeys[resultKey.getRealID()] = resultKey;
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
			}, h.sF(function (decrypted) {
				if (!decrypted) {
					this.last("not a private key");
				}

				this.ne(intKey.getSecret().unkem(tag));
			}), callback);
		}

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
				throw "keychain not found";
			}
		}), callback);
	}

	/** generate a crypt key
	* @param curve curve to use
	* @param callback callback
	*/
	function cryptKeyGenerate(curve, callback) {
		step(function cryptGenI1() {
			var curveO = chelper.getCurve(curve), key = sjcl.ecc.elGamal.generateKeys(curveO);
			this.ne(key.pub, key.sec);
		}, h.sF(function cryptGenI2(pub, sec) {
			/*jslint nomen: true*/
			var p = pub._point, data = {
				point: {
					x: chelper.bits2hex(p.x.toBits()),
					y: chelper.bits2hex(p.y.toBits())
				},
				exponent: chelper.bits2hex(sec._exponent.toBits()),
				realid: generateid(),
				curve: chelper.getCurveName(pub._curve)
			};
			/*jslint nomen: false*/

			var key = makeCryptKey(data);

			newKeys.push(key);

			this.ne(key);
		}), callback);
	}

	CryptKey.get = cryptKeyGet;
	CryptKey.generate = cryptKeyGenerate;

	/** a signature key
	* @param keyData sign key data
	*/
	SignKey = function (keyData) {
		var publicKey, intKey, x, y, curve, point, realid, isPrivateKey = false;

		if (!keyData || !keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid) {
			throw "invalid data";
		}

		if (!keyData.decryptors && !keyData.exponent) {
			throw "invalid data";
		}

		curve = chelper.getCurve(keyData.curve);

		x =	curve.field.fromBits(chelper.hex2bits(keyData.point.x));
		y = curve.field.fromBits(chelper.hex2bits(keyData.point.y));
		point = new sjcl.ecc.point(curve, x, y);

		publicKey = new sjcl.ecc.elGamal.publicKey(curve, point);

		realid = keyData.realid;

		//add exponent/decryptors
		if (keyData.exponent) {
			isPrivateKey = true;

			intKey = new Key(this, realid, keyData.decryptors, {
				secret: keyData.exponent,
				postProcessor: function cryptKeyPostProcessor(secret, callback) {
					step(function () {
						var exponent = new sjcl.bn(secret);

						this.ne(new sjcl.ecc.elGamal.privateKey(curve, exponent));
					}, callback);
				}
			});
		} else if (keyData.decryptors) {
			isPrivateKey = true;
			intKey = new Key(this, realid, keyData.decryptors, {
				postProcessor: function cryptKeyPostProcessor(secret, callback) {
					step(function () {
						var exponent = new sjcl.bn(secret);

						this.ne(new sjcl.ecc.elGamal.privateKey(curve, exponent));
					}, callback);
				}
			});
		}

		//add private key functions
		if (isPrivateKey) {
			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getRealID = intKey.getRealID;
			this.getDecryptorsF = intKey.getDecryptors;

			this.addAsymDecryptor = intKey.addAsymDecryptor;
			this.addSymDecryptor = intKey.addSymDecryptor;
			this.addPWDecryptor = intKey.addPWDecryptor;

			this.getFullUploadData = function () {
				var p = publicKey._point, data = {
					realid: intKey.getRealID(),
					point: {
						x: chelper.bits2hex(p.x.toBits()),
						y: chelper.bits2hex(p.y.toBits())
					},
					curve: chelper.getCurveName(publicKey._curve),
					decryptor: intKey.getDecryptorData()
				};

				return data;
			};

			this.getDecryptorData = intKey.getDecryptorData;
		}

		function signF(hash, callback) {
			step(function () {
				intKey.decryptKey(this);
			}, h.sF(function (decrypted) {
				if (!decrypted) {
					this.last("could not decrypt key");
				}

				this.ne(intKey.getSecret().sign(hash));
			}), callback);
		}

		function verifyF(signature, hash, callback) {
			step(function () {
				this.ne(publicKey.verify(hash, signature));
			}, callback);
		}

		if (isPrivateKey) {
			this.sign = signF;
		}

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
				throw "keychain not found";
			}
		}), callback);
	}

	/** generate a sign key
	* @param curve curve for the key
	* @param callback callback
	*/
	function signKeyGenerate(curve, callback) {
		step(function signGenI1() {
			var curveO = chelper.getCurve(curve), key = sjcl.ecc.ecdsa.generateKeys(curveO);
			this.ne(key.pub, key.sec);
		}, h.sF(function signGenI2(pub, sec) {
			/*jslint nomen: true*/
			var p = pub._point, data = {
				point: {
					x: chelper.bits2hex(p.x.toBits()),
					y: chelper.bits2hex(p.y.toBits())
				},
				exponent: chelper.bits2hex(sec._exponent.toBits()),
				realid: generateid(),
				curve: chelper.getCurveName(pub._curve)
			};
			/*jslint nomen: false*/

			var key = makeSignKey(data);
			newKeys.push(key);

			this.ne(key);
		}), callback);
	}

	SignKey.get = signKeyGet;
	SignKey.generate = signKeyGenerate;

	/** make a key out of keyData. mainly checks type and calls appropriate function */
	makeKey = function makeKeyF(key) {
		if (key.type === "symKey") {
			makeSymKey(key);
		} else if (key.type === "cryptKey") {
			makeCryptKey(key);
		} else if (key.type === "signKey") {
			makeSignKey(key);
		} else {
			throw "unknown key type";
		}
	};

	function object2Hash(obj, arr) {
		var val, hashObj = {};
		for (val in obj) {
			if (obj.hasOwnProperty(val)) {
				if (typeof obj[val] === "object") {
					hashObj[val] = object2Hash(obj[val]);
				} else if (typeof obj[val] === "function") {
					throw "can not sign objects with functions";
				} else {
					hashObj[val] = obj[val].replace("{", "\{");
				}
			}
		}

		var sortation = Object.keys(hashObj).sort();
		var json = JSON.stringify(hashObj, sortation);

		if (!arr) {
			return "hash:" + chelper.bits2hex(sjcl.hash.sha256.hash(json));
		}

		return sjcl.hash.sha256.hash(json);
	}

	/** our interface */
	keyStore = {
		reset: function reset() {
			symKeys = {};
			cryptKeys = {};
			signKeys = {};
			passwords = {};
		},

		setKeyGenIdentifier: function (identifier) {
			keyGenIdentifier = identifier;
		},

		hash: {
			hash: function (text) {
				return chelper.bits2hex(sjcl.hash.sha256.hash(text));
			},

			hashPW: function (pw) {
				return chelper.bits2hex(sjcl.hash.sha256.hash(pw)).substr(0, 10);
			}
		},

		upload: {
			getData: function () {
				var data = {
					addKeys: {},
					addKeyDecryptors: {}
				};
				/*
				{
					addKeys: {
						realid1: key1,
						realid2: key2,
						...
					},
					addKeyDecryptor: {
						realid1: decryptors1
						realid2: decryptors2
					}
				}
				*/

				var i;
				for (i = 0; i < newKeys.length; i += 1) {
					data.addKeys[newKeys[i].getRealID()] = newKeys[i].getFullUploadData();
				}

				for (i = 0; i < dirtyKeys.length; i += 1) {
					if (!data.addKeys[dirtyKeys[i].getRealID()]) {
						data.addKeyDecryptors[dirtyKeys[i].getRealID()] = dirtyKeys[i].getDecryptorData();
					}
				}

				return data;
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

		sym: {
			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback) {
				step(function symGen1() {
					SymKey.generate(this);
				}, h.sF(function symGen2(key) {
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
			encrypt: function (text, realKeyID, callback) {
				step(function symEncrypt1() {
					text = "data::" + text;
					SymKey.get(realKeyID, this);
				}, h.sF(function symEncrypt2(key) {
					key.encrypt(text, this);
				}), h.sF(function symEncrypt3(ct) {
					this.ne(ct);
				}), callback);
			},

			/** decrypt an encrypted text
			* @param ctext text to decrypt
			* @param realKeyID key to decrypt with
			* @param callback callback
			*/
			decrypt: function (ctext, realKeyID, callback) {
				step(function () {
					SymKey.get(realKeyID, this);
				}, h.sF(function (key) {
					key.decrypt(ctext, this);
				}), h.sF(function (text) {
					if (text.substr(0, 6) === "data::") {
						this.ne(text.substr(6));
					} else {
						throw new AccessViolation();
					}
				}), callback);
			}
		},

		asym: {
			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback) {
				step(function cryptGen1() {
					CryptKey.generate("256", this);
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
			}
		},

		sign: {
			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback) {
				step(function signGen1() {
					SignKey.generate("256", this);
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
			signText: function (text, realID, callback) {
				keyStore.sign.signHash(sjcl.hash.sha256.hash(text), realID, callback);
			},

			/** sign a hash
			* @param hash hash to sign
			* @param realID key id with which to sign
			* @param callback callback
			*/
			signHash: function (hash, realID, callback) {
				step(function () {
					hash = chelper.hex2bits(hash);

					SignKey.get(realID, this);
				}, h.sF(function (key) {
					key.sign(hash, this);
				}), h.sF(function (signature) {
					this.ne(signature);
				}), callback);
			},

			signObject: function signObjectF(object, realID, callback) {
				step(function signO1() {
					var hash = object2Hash(object, true);
					keyStore.sign.signHash(hash, realID, this);
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
					var hash = object2Hash(object, true);
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
			}
		}
	};


	return keyStore;
});