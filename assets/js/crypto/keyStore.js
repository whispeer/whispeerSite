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
/*
{
	"crv":"P-256",
	"ext":true,
	"key_ops":["verify"],
	"kty":"EC",
	"x":"_u7VBNaYjLEcaj2Vw1t-CiH_or3xPudekyW4iJrjwgs",
	"y":"YMv7KmTnxpU16ytQrAYgcw4bpoQuPZwLSwvM_imsqxA"
}
*/
define(["whispeerHelper", "crypto/helper", "libs/sjcl", "crypto/waitForReady", "crypto/sjclWorkerInclude", "crypto/objectHasher", "asset/errors", "bluebird", "debug"], function (h, chelper, sjcl, waitForReady, sjclWorkerInclude, ObjectHasher, errors, Bluebird, debug) {
	"use strict";

	var keyStoreDebug = debug("whispeer:keyStore");

	var keyGetFunction, firstVerify = true, afterAsyncCall, improvementListener = [], makeKey, keyStore, recovery = false, sjclWarning = true;

	/** dirty and new keys to upload. */
	var dirtyKeys = [], newKeys = [];

	/** cache for keys */
	var symKeys = {}, cryptKeys = {}, signKeys = {};
	var password = "",  keyGenIdentifier = "", mainKey;

	/** identifier list of keys we can use for encryption. this is mainly a safeguard for coding bugs. */
	var keysUsableForEncryption = [];

	var privateActionsBlocked = false;

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
			var pw = localStorage.getItem("whispeer.session.password");
			if (pw && typeof pw === "string") {
				password = pw;
			}
		}
	} catch (e) {
		keyStoreDebug(e);
	}

	function requireAsync(modules) {
		return new Bluebird(function (resolve, reject) {
			require(modules, function () {
				resolve(Array.prototype.slice.call(arguments));
			}, reject);
		});
	}

	function getSubtle() {
		if (window.msCrypto && window.msCrypto.subtle) {
			return window.msCrypto.subtle;
		}

		if (!window.crypto) {
			return false;
		}

		if (window.crypto.subtle) {
			return window.crypto.subtle;
		}

		if (window.crypto.webkitSubtle) {
			return window.crypto.webkitSubtle;
		}

		return false;
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

	function determineLength(object) {
		if (typeof object !== "object") {
			return 0;
		}

		return Object.keys(object).reduce(function (prev, cur) {
			return prev + 1 + determineLength(object[cur]);
		}, 0);
	}

	function stringifyObject(object, version) {
		var length = determineLength(object);

		if (h.parseDecimal(version) > 2 && length < 500) {
			return Bluebird.resolve(new ObjectHasher(object, version).stringify());
		}

		return sjclWorkerInclude.stringify(object, version);
	}

	function removeExpectedPrefix(bitArray, prefix) {
		var len = prefix.length, part;
		prefix = sjcl.codec.utf8String.toBits(prefix);

		if (bitArray instanceof ArrayBuffer) {
			var buf8 = new Uint8Array(bitArray);
			part = sjcl.codec.arrayBuffer.toBits(new Uint8Array(buf8.subarray(0, len)).buffer);
			if (sjcl.bitArray.equal(prefix, part)) {
				return new Uint8Array(buf8.subarray(len)).buffer;
			}
		} else {
			part = sjcl.bitArray.bitSlice(bitArray, 0, 8*len);
			if (sjcl.bitArray.equal(prefix, part)) {
				return sjcl.bitArray.bitSlice(bitArray, 8*len);
			}
		}

		throw new errors.DecryptionError("invalid prefix (should be: " + prefix + ")");
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
		return Bluebird.try(function () {
			var result = sjcl.json._encrypt(pw, text);
			this.ne(chelper.sjclPacket2Object(result));
		}).nodeify(callback);
	}

	/** our internal decryption function.
	* @param decryptorid id of decryptor
	* @param decryptortype decryptor type
	* @param ctext crypted text
	* @param callback called with results
	* @param iv necessary for symkey/pw encrypted data
	* @param salt necessary for pw encrypted data
	*/
	function internalDecrypt(decryptorid, decryptortype, ctext, iv, salt) {
		return Bluebird.try(function () {
			if (decryptortype === "symKey" || decryptortype === "backup") {
				return Bluebird.try(function () {
					return SymKey.get(decryptorid);
				}).then(function (theKey) {
					return theKey.decryptKey().thenReturn(theKey);
				}).then(function (theKey) {
					return theKey.decrypt(ctext, iv);
				}).then(function (decryptedData) {
					return removeExpectedPrefix(decryptedData, "key::");
				});
			} else if (decryptortype === "cryptKey") {
				return Bluebird.try(function () {
					return CryptKey.get(decryptorid);
				}).then(function (theKey) {
					return theKey.decryptKey().thenReturn(theKey);
				}).then(function (theKey) {
					return theKey.unkem(chelper.hex2bits(ctext));
				});
			} else if (decryptortype === "pw") {
				return Bluebird.try(function () {
					var jsonData = chelper.Object2sjclPacket({
						ct: ctext,
						iv: iv,
						salt: salt
					}), result;
					if (password !== "") {
						result = sjcl.decrypt(password, jsonData, { raw: 1 });

						return removeExpectedPrefix(result, "key::");
					}

					throw new errors.DecryptionError("no pw");
				});
			} else {
				throw new errors.InvalidDataError("invalid decryptortype");
			}
		});
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
		var theKey = this, decryptKeyPromise, dirtyDecryptors = [], internalSecret, preSecret;

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
			decryptKeyPromise = Bluebird.resolve();
		}

		/** is the key decrypted */
		this.decrypted = function decryptedF() {
			return decryptKeyPromise && decryptKeyPromise.isFulfilled();
		};

		function decryptKey() {
			var usedDecryptor;
			if (!decryptKeyPromise) {
				decryptKeyPromise = Bluebird.try(function () {
					usedDecryptor = theKey.getFastestDecryptor();

					if (!usedDecryptor || !usedDecryptor.decryptor) {
						throw new errors.DecryptionError("Could not Decrypt key!");
					}

					var d = usedDecryptor.decryptor;

					return internalDecrypt(d.decryptorid, d.type, d.ct, d.iv, d.salt);
				}).then(function (result) {
					if (result === false) {
						throw new Error("Could not decrypt");
					}

					if (usedDecryptor.decryptor.type === "cryptKey") {
						h.callEach(improvementListener, [theKey.getRealID()]);
					}

					return pastProcessor(result);
				}).then(function (pastProcessedSecret) {
					preSecret = internalSecret;
					internalSecret = pastProcessedSecret;
				}).catch(function (err) {
					globalErrors.push(err || { err: "internaldecryptor returned false for realid: " + realid });
					keyStoreDebug(err);
					keyStoreDebug("decryptor failed for key: " + realid);

					decryptors = decryptors.filter(function (decryptor) {
						return decryptor !== usedDecryptor.decryptor;
					});

					if (decryptors.length === 0) {
						throw new errors.DecryptionError("Could finally not decrypt key!");
					}

					return decryptKey();
				});
			}

			return decryptKeyPromise;
		}

		/** decrypt this key.
		* @param callback called with true/false
		* searches your whole keyspace for a decryptor and decrypts if possible
		*/
		this.decryptKey = decryptKey;


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
				keyStoreDebug("dafuq, deeply nested keys");
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
			return Bluebird.try(function () {
				var decryptorData = {
					decryptorid: realid,
					type: "cryptKey",
					ct: chelper.bits2hex(tag),
					dirty: true
				};

				decryptors.push(decryptorData);
				dirtyKeys.push(superKey);
				dirtyDecryptors.push(decryptorData);
			}).nodeify(callback);
		}

		/** add symKey decryptor.
		* @param realid realid of decryptor
		* @param callback callback
		*/
		function addSymDecryptorF(realid, callback) {
			return Bluebird.try(function () {
				if (realid instanceof SymKey) {
					return realid;
				}

				return SymKey.get(realid);
			}).then(function (cryptorKey) {
				return theKey.decryptKey().thenReturn(cryptorKey);
			}).then(function (cryptorKey) {
				var secret = preSecret || internalSecret;
				return cryptorKey.encryptWithPrefix("key::", secret).then(function (data) {
					var decryptorData = {
						decryptorid: cryptorKey.getRealID(),
						type: "symKey",
						ct: chelper.bits2hex(data.ct),
						iv: chelper.bits2hex(data.iv),
						dirty: true
					};

					decryptors.push(decryptorData);
					dirtyKeys.push(superKey);
					dirtyDecryptors.push(decryptorData);

					return cryptorKey.getRealID();
				});	
			}).nodeify(callback);
		}

		/** add a pw decryptor
		* @param pw password
		* @param callback callback
		*/
		function addPWDecryptorF(pw, callback) {
			return theKey.decryptKey().then(function () {
				var prefix = sjcl.codec.utf8String.toBits("key::");
				var data = sjcl.bitArray.concat(prefix, preSecret || internalSecret);

				return chelper.sjclPacket2Object(sjcl.json._encrypt(pw, data));
			}).then(function (data) {
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

				return decryptorData;
			}).nodeify(callback);
		}

		this.addAsymDecryptor = addAsymDecryptorF;
		this.addSymDecryptor = addSymDecryptorF;
		this.addPWDecryptor = addPWDecryptorF;

		/** get all data which need uploading. */
		function getDecryptorDataF(includeAllDecryptors) {
			//get the upload data for the decryptors of this key.
			//this will be called in the keys upload() function.

			var decryptorArray = dirtyDecryptors;

			if (includeAllDecryptors) {
				decryptorArray = decryptors;
			}

			return decryptorArray.map(function (decryptor) {
				var tempR = {}, k;
				for (k in decryptor) {
					if (decryptor.hasOwnProperty(k)) {
						tempR[k] = decryptor[k];
					}
				}

				if (tempR.decryptorid) {
					tempR.decryptorid = correctKeyIdentifier(tempR.decryptorid);
				}

				return tempR;
			});
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

		this.getUploadData = function (includeAllDecryptors) {
			var data = {
				realid: intKey.getRealID(),
				type: "sym",
				decryptors: this.getDecryptorData(includeAllDecryptors),
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

		this.encryptWithPrefix = function (prefix, data, progressCallback, noDecode) {
			if (privateActionsBlocked) {
				throw new errors.SecurityError("Private Actions are blocked");
			}

			if (!isKeyUsableForEncryption(intKey.getRealID())) {
				throw new errors.SecurityError("Key not usable for encryption: " + intKey.getRealID());
			}

			return intKey.decryptKey().then(function () {
				if (typeof data === "string") {
					data = sjcl.codec.utf8String.toBits(data);
				}

				prefix = sjcl.codec.utf8String.toBits(prefix);

				if (data instanceof ArrayBuffer) {
					prefix = sjcl.codec.arrayBuffer.fromBits(prefix, false);
					var l = prefix.byteLength + data.byteLength;
					var p = 16;
					var padding = new ArrayBuffer(p-l%p);
					data = h.concatBuffers(prefix, data, padding);
				} else {
					data = sjcl.bitArray.concat(prefix, data);
				}

				return sjclWorkerInclude.sym.encrypt(intKey.getSecret(), data, progressCallback);
			}).then(function (result) {
				if (noDecode) {
					return result;
				} else {
					return chelper.sjclPacket2Object(result);
				}
			});
		};

		/** decrypt some text.
		* @param ctext text to decrypt
		* @param callback called with results
		* @param optional iv initialization vector
		*/
		this.decrypt = function (ctext, iv) {
			return intKey.decryptKey().then(function () {
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
					return sjcl.json._decrypt(intKey.getSecret(), ctext, {raw: 1});
				} else {
					return sjclWorkerInclude.sym.decrypt(intKey.getSecret(), ctext);
				}				
			});
		};
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
		return keyGetFunction(realKeyID, callback);
	}

	/** generates a symmetric key
	* @param callback callback
	*/
	function symKeyGenerate(callback, comment) {
		return Bluebird.try(function () {
			return new SymKey();
		}).then(function (key) {
			if (symKeys[key.getRealID()]) {
				return symKeyGenerate();
			}

			symKeys[key.getRealID()] = key;
			newKeys.push(key);
			makeKeyUsableForEncryption(key.getRealID());

			key.setComment(comment);

			return symKeys[key.getRealID()];
		}).nodeify(callback);
	}

	/** load  a symkey and its keychain */
	SymKey.get = function (realKeyID, callback) {
		return Bluebird.try(function () {
			if (!symKeys[realKeyID]) {
				return getKey(realKeyID);
			}
		}).then(function () {
			if (symKeys[realKeyID]) {
				return symKeys[realKeyID];
			}

			throw new errors.InvalidDataError("keychain not found (sym)");
		}).nodeify(callback);
	};

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

			this.getUploadData = function (includeAllDecryptors) {
				var p = publicKey._point, data = {
					realid: intKey.getRealID(),
					point: {
						x: chelper.bits2hex(p.x.toBits()),
						y: chelper.bits2hex(p.y.toBits())
					},
					curve: chelper.getCurveName(publicKey._curve),
					type: "crypt",
					decryptors: this.getDecryptorData(includeAllDecryptors),
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

		this.getFingerPrint = getFingerPrintF;

		/** create a key 
		* param callback callback
		*/
		this.kem = function (callback) {
			if (privateActionsBlocked) {
				throw new errors.SecurityError("Private Actions are blocked");
			}

			if (!isKeyUsableForEncryption(intKey.getRealID())) {
				throw new errors.SecurityError("Key not usable for encryption: " + intKey.getRealID());
			}

			return Bluebird.try(function () {
				return publicKey.kem();
			}).then(function (keyData) {
				var resultKey = new SymKey(keyData.key);
				symKeys[resultKey.getRealID()] = resultKey;
				newKeys.push(resultKey);
				makeKeyUsableForEncryption(resultKey.getRealID());
				return resultKey.addAsymDecryptor(realid, keyData.tag).thenReturn(resultKey.getRealID());
			}).nodeify(callback);
		};

		if (isPrivateKey) {
			/** unkem a key from a tag
			* @param tag the tag
			* @param callback callback
			*/
			this.unkem = function (tag) {
				return Bluebird.try(function () {
					if (!isPrivateKey) {
						throw new Error("not a private key");
					}

					return intKey.decryptKey();
				}).then(function () {
					keyStoreDebug("slow decrypt");

					return intKey.getSecret().unkem(tag);
				});
			};
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

	/** get a crypt key
	* @param realKeyID keys real id
	* @param callback callback
	*/
	CryptKey.get = function (realKeyID, callback) {
		return Bluebird.try(function () {
			if (!cryptKeys[realKeyID]) {
				return getKey(realKeyID);
			}
		}).then(function () {
			if (cryptKeys[realKeyID]) {
				return cryptKeys[realKeyID];
			}

			throw new errors.InvalidDataError("keychain not found");
		}).nodeify(callback);
	};

	/** generate a crypt key
	* @param curve curve to use
	* @param callback callback
	*/
	CryptKey.generate = function (curve, callback, comment) {
		return waitForReady.async().then(function () {
			var curveO = chelper.getCurve(curve), rawKey = sjcl.ecc.elGamal.generateKeys(curveO);

			/*jslint nomen: true*/
			var p = rawKey.pub._point, data = {
				point: {
					x: chelper.bits2hex(p.x.toBits()),
					y: chelper.bits2hex(p.y.toBits())
				},
				exponent: rawKey.sec._exponent.toBits(),
				realid: generateid(fingerPrintPublicKey(rawKey.pub)),
				curve: chelper.getCurveName(rawKey.pub._curve),
				comment: comment
			};
			/*jslint nomen: false*/

			var key = makeCryptKey(data);
			newKeys.push(key);

			key.setComment(comment);

			makeKeyUsableForEncryption(key.getRealID());

			return key;
		}).nodeify(callback);
	};

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

		this.getJWKPublicKey = function () {
			var p = publicKey._point;

			return {
				"crv": "P-256",
				"ext": true,
				"key_ops":["verify"],
				"kty": "EC",
				"x": keyStore.format.base64ToUrl(sjcl.codec.base64.fromBits(p.x.toBits())),
				"y": keyStore.format.base64ToUrl(sjcl.codec.base64.fromBits(p.y.toBits()))
			};
		};

		this.getSubtlePublicKey = function () {
			if (!this._getSubtlePublicKeyPromise) {
				this._getSubtlePublicKeyPromise = getSubtle().importKey("jwk", this.getJWKPublicKey(), {
					name: "ECDSA",
					namedCurve: "P-256"
				}, true, ["verify"]);
			}

			return this._getSubtlePublicKeyPromise;
		};

		//add private key functions
		if (isPrivateKey) {
			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getRealID = intKey.getRealID;
			this.getDecryptorsF = intKey.getDecryptors;

			this.addAsymDecryptor = intKey.addAsymDecryptor;
			this.addSymDecryptor = intKey.addSymDecryptor;
			this.addPWDecryptor = intKey.addPWDecryptor;

			this.getUploadData = function (includeAllDecryptors) {
				var p = publicKey._point, data = {
					realid: intKey.getRealID(),
					point: {
						x: chelper.bits2hex(p.x.toBits()),
						y: chelper.bits2hex(p.y.toBits())
					},
					curve: chelper.getCurveName(publicKey._curve),
					type: "sign",
					decryptors: this.getDecryptorData(includeAllDecryptors),
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

		var theKey = this;

		function subtleVerify(key, signatureBuf, buf) {
			return getSubtle().verify({
				name: "ECDSA",
				namedCurve: "P-256",
				hash: "SHA-256"
			}, key.publicKey, signatureBuf, buf);
		}

		if (isPrivateKey) {
			this.sign = function (hash, type) {
				if (privateActionsBlocked) {
					throw new errors.SecurityError("Private Actions are blocked");
				}

				return requireAsync(["crypto/trustManager", "crypto/signatureCache"]).spread(function (trustManager, signatureCache) {
					return Bluebird.try(function () {
						if (!trustManager.isLoaded) {
							return trustManager.listenPromise("loaded");
						}
					}).then(function () {
						if (!trustManager.hasKeyData(intKey.getRealID())) {
							keyStoreDebug("key not in key database");
							alert("key not in key database: " + intKey.getRealID() + " - please report this issue to support@whispeer.de!");
							throw new errors.SecurityError("key not in key database");
						}

						return intKey.decryptKey();
					}).then(function () {
						return intKey.getSecret().sign(hash);
						//sjclWorkerInclude.asym.sign(intKey.getSecret(), hash).nodeify(this);
					}).then(function (signature) {
						if (signatureCache.isLoaded()) {
							signatureCache.addValidSignature(signature, hash, realid, type);
						}

						return signature;
					});
				});
			};
		}

		function verifySjcl(signature, hash) {
			if (sjclWarning) {
				keyStoreDebug("Verifying with sjcl");
				sjclWarning = false;
			}
			if (firstVerify) {
				firstVerify = false;
				return Bluebird.resolve(publicKey.verify(hash, signature));
			}

			return sjclWorkerInclude.asym.verify(publicKey, signature, hash);
		}

		function verifySubtle(signature, text) {
			return Bluebird.try(function () {
				return theKey.getSubtlePublicKey();
			}).then(function (key) {
				var signatureBuf = sjcl.codec.arrayBuffer.fromBits(signature);
				var buf = new TextEncoder("utf-8").encode(text);

				return subtleVerify({ publicKey: key }, signatureBuf, buf);
			});
		}

		function verify(signature, text, hash) {
			if (!getSubtle()) {
				return verifySjcl(signature, hash);
			}

			return verifySubtle(signature, text).then(function (valid) {
				if (!valid) {
					return verifySjcl(signature, hash);
				}

				return valid;
			}).catch(function (e) {
				if (sjclWarning) {
					console.error(e);
				}
				return verifySjcl(signature, hash);
			});
		}

		function subtleToHex(buffer) {
			var hexCodes = [];
			var view = new DataView(buffer);
			for (var i = 0; i < view.byteLength; i += 4) {
				// Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
				var value = view.getUint32(i);
				// toString(16) will give the hex representation of the number without padding
				var stringValue = value.toString(16);
				// We use concatenation and slice for padding
				var padding = "00000000";
				var paddedValue = (padding + stringValue).slice(-padding.length);
				hexCodes.push(paddedValue);
			}

			// Join all the hex strings into one
			return hexCodes.join("");
		}

		function hash(text) {
			return Bluebird.resolve(text).then(function () {
				if (!getSubtle()) {
					throw new Error("subtle not available");
				}

				var buf = new TextEncoder("utf-8").encode(text);
				return getSubtle().digest("SHA-256", buf);
			}).then(function (hash) {
				return subtleToHex(hash);
			}).catch(function () {
				keyStoreDebug("Subtle hashing failed falling back to sjcl");
				return sjcl.hash.sha256.hash(text);
			});
		}

		this.getFingerPrint = getFingerPrintF;
		this.verify = function (signature, text, type, id) {
			return requireAsync(["crypto/trustManager", "crypto/signatureCache"]).spread(function (trustManager, signatureCache) {
				return hash(text).then(function (hash) {
					hash = chelper.hex2bits(hash);

					if (!trustManager.hasKeyData(intKey.getRealID())) {
						throw new errors.SecurityError("key not in key database");
					}

					if (signatureCache.isValidSignatureInCache(signature, hash, realid)) {
						signatureCache.addValidSignature(signature, hash, realid, type, id);
						return Bluebird.resolve(true);
					}

					keyStoreDebug("Slow verify of type: " + type);
					var name = chelper.bits2hex(signature).substr(0, 10);

					if (debug.enabled("whispeer:keyStore")) {
						console.time("verify-" + name);
					}

					return verify(signature, text, hash).then(function (valid) {
						if (debug.enabled("whispeer:keyStore")) {
							console.timeEnd("verify-" + name);
						}

						if (valid) {
							signatureCache.addValidSignature(signature, hash, realid, type, id);
						}

						return valid;
					}).catch(function (e) {
						console.error(e);
						return false;
					});
				});
			});
		};
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
	SignKey.get = function signKeyGet(realKeyID, callback) {
		return Bluebird.try(function () {
			if (!signKeys[realKeyID]) {
				return getKey(realKeyID);
			}
		}).then(function () {
			if (signKeys[realKeyID]) {
				return signKeys[realKeyID];
			}

			throw new errors.InvalidDataError("keychain not found (sign)");
		}).nodeify(callback);
	};

	/** generate a sign key
	* @param curve curve for the key
	* @param callback callback
	*/
	SignKey.generate = function (curve, callback, comment) {
		return waitForReady.async().then(function () {
			var curveO = chelper.getCurve(curve), rawKey = sjcl.ecc.ecdsa.generateKeys(curveO);

			/*jslint nomen: true*/
			var p = rawKey.pub._point, data = {
				point: {
					x: chelper.bits2hex(p.x.toBits()),
					y: chelper.bits2hex(p.y.toBits())
				},
				exponent: rawKey.sec._exponent.toBits(),
				realid: generateid(fingerPrintPublicKey(rawKey.pub)),
				curve: chelper.getCurveName(rawKey.pub._curve)
			};
			/*jslint nomen: false*/

			var key = makeSignKey(data);
			newKeys.push(key);

			key.setComment(comment);

			return key;
		}).nodeify(callback);
	};

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

	var ObjectPadder = function (obj, minLength) {
		this._obj = obj;
		this._minLength = minLength;
	};

	ObjectPadder.prototype._padObject = function (val) {
		return Bluebird.props(h.objectMap(val, function (value) {
			var padder = new ObjectPadder(value, this._minLength);
			return Bluebird.promisify(padder.pad, padder)();
		}, this));
	};

	ObjectPadder.prototype._padArray = function (val) {
		return Bluebird.resolve(val).bind(this).map(function (value) {
			var padder = new ObjectPadder(value, this._minLength);
			return Bluebird.promisify(padder.pad, padder)();
		});
	};

	ObjectPadder.prototype._padString = function (val) {
		var length = this._minLength - (val.length % this._minLength) + this._minLength;

		return Bluebird.try(function () {
			return keyStore.random.hex(length);
		}).then(function (rand) {
			return rand + "::" + val;
		});
	};

	ObjectPadder.prototype._padNumber = function (val) {
		return this._padString(val.toString()).then(function (padded) {
			return "num::" + padded;
		});
	};

	ObjectPadder.prototype._padAttribute = function (attr) {
		var type = typeof attr;
		if (type === "object") {
			if (attr instanceof Array) {
				return this._padArray(attr);
			}

			return this._padObject(attr);
		} else if (type === "string") {
			return this._padString(attr);
		} else if (type === "number") {
			return this._padNumber(attr);
		} else if (type === "boolean") {
			return this._padNumber((attr ? 1 : 0));
		}

		throw new errors.InvalidDataError("could not pad value of type " + type);
	};

	ObjectPadder.prototype.pad = function (cb) {
		return this._padAttribute(this._obj).nodeify(cb);
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
		var isNumber = false;

		if (val.indexOf("num::") === 0) {
			isNumber = true;

			val = val.substr(5);
		}

		if (val.length%this._minLength !== 2) {
			throw new errors.InvalidDataError("padding size invalid");
		}

		var paddingIndex = val.indexOf("::");

		if (paddingIndex === -1) {
			throw new errors.InvalidDataError("no padding seperator found");
		}

		var unpadded = val.substr(paddingIndex + 2);

		if (isNumber) {
			return h.parseDecimal(unpadded);
		}

		return unpadded;
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

	ObjectCryptor.prototype._encryptAttr = function (cur) {
		if (typeof cur === "object") {
			return new ObjectCryptor(this._key, this._depth-1, cur).encrypt();
		} else if (typeof cur === "string" || typeof cur === "number" || typeof cur === "boolean") {
			return this._key.encryptWithPrefix("data::", cur.toString());
		}

		throw new errors.InvalidDataError("Invalid encrypt!");
	};

	ObjectCryptor.prototype._encryptObject = function () {
		return Bluebird.props(h.objectMap(this._object, function (value, attr) {
			if (attr !== "key") {
				return this._encryptAttr(value);
			}
		}, this));
	};

	ObjectCryptor.prototype._encryptJSON = function () {
		return this._key.encryptWithPrefix("json::", JSON.stringify(this._object));
	};

	ObjectCryptor.prototype.encrypt = function () {
		if (this._depth > 0) {
			return this._encryptObject();
		} else {
			return this._encryptJSON();
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
			this._key.decrypt(cur).nodeify(cb);
		} else {
			new ObjectCryptor(this._key, this._depth-1, cur).decrypt(cb);
		}
	};

	ObjectCryptor.prototype._decryptEndAttribute = function () {
		return this._key.decrypt(this._object).bind(this).then(function (result) {
			return this.decryptCorrectObject(result);
		});
	};

	ObjectCryptor.prototype._decryptPartialObjects = function () {
		return Bluebird.props(h.objectMap(this._object, function (value, attr) {
			if (attr !== "key") {
				return new ObjectCryptor(this._key, this._depth-1, value).decrypt();
			}
		}, this));
	};

	ObjectCryptor.prototype.decrypt = function () {
		if (this._depth < 0) {
			throw new errors.DecryptionError("invalid decryption depth!");
		}

		if (this._object.iv && this._object.ct) {
			return this._decryptEndAttribute();
		} else {
			return this._decryptPartialObjects();
		}
	};

	/** our interface */
	keyStore = {
		reset: function reset() {
			recovery = false;
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

		setAfterAsyncCall: function (cb) {
			afterAsyncCall = cb;
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
			blockPrivateActions: function () {
				privateActionsBlocked = true;
			},

			allowPrivateActions: function () {
				privateActionsBlocked = false;
			},

			arePrivateActionsBlocked: function () {
				return privateActionsBlocked;
			},

			addEncryptionIdentifier: function (realid) {
				makeKeyUsableForEncryption(realid);
			},

			setPassword: function (pw) {
				recovery = false;
				password = pw;
			},

			verifyWithPW: function (data, expectedResult) {
				if (!recovery) {
					//decrypt data with pw
					var result = sjcl.decrypt(password, chelper.Object2sjclPacket(data));
					//unpad data
					result = new ObjectPadder(JSON.parse(result), 128).unpad();

					//check with expectedresult
					if (!h.deepEqual(expectedResult, result)) {
						throw new errors.SecurityError("verify with pw failed");
					}
				}
			},

			makePWVerifiable: function (data, pw, cb) {
				return new ObjectPadder(data, 128).pad().then(function (paddedData) {
					return encryptPW(pw, JSON.stringify(paddedData));
				}).nodeify(cb);
			}
		},

		format: {
			urlToBase64: function(str) {
				return str.replace(/-/g, "+").replace(/_/g, "/");
			},
			base64ToUrl: function(str) {
				return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
			},
			base64ToBits: function (base64) {
				return sjcl.codec.base64.toBits(base64);
			},
			bitsToBase64: function (bits) {
				return sjcl.codec.base64.fromBits(bits);
			},
			fingerPrint: function (keyID) {
				var hex = keyID.split(":")[1];
				return sjcl.codec.base32.fromBits(sjcl.codec.hex.toBits(hex)).toUpperCase();
			},
			base32: function (bits) {
				return sjcl.codec.base32.fromBits(bits);
			},
			unBase32: function (bits) {
				return sjcl.codec.base32.toBits(bits);
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
				return chelper.hash(text);
			},

			hashBigBase64CodedData: function (text, cb) {
				sjclWorkerInclude.hash(text).nodeify(cb);
			},

			hashPW: function (pw, salt) {
				return chelper.hashPW(pw, salt);
			},

			hashObjectOrValueHexAsync: function (val, version, cb) {
				return Bluebird.try(function () {
					if (typeof val === "object") {
						return sjclWorkerInclude.stringify(val, version, true);
					} else {
						return sjcl.hash.sha256.hash("data::" + val);
					}
				}).then(function (value) {
					return chelper.bits2hex(value);
				}).then(function (hash) {
					return "hash::" + hash;
				}).nodeify(cb);
			},

			hashObjectOrValueHex: function (val, version) {
				if (typeof val === "object") {
					return "hash::" + new ObjectHasher(val, version).hash();
				} else {
					return "hash::" + chelper.bits2hex(sjcl.hash.sha256.hash("data::" + val));
				}
			}
		},

		upload: {
			preLoadMultiple: function (realids, cb) {
				return Bluebird.resolve(realids).map(function (realid) {
					return getKey(realid);
				}).nodeify(cb);
			},
			isKeyLoaded: function (realid) {
				return symKeys.hasOwnProperty(realid) || cryptKeys.hasOwnProperty(realid) || signKeys.hasOwnProperty(realid);
			},
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
			setKeyGet: function (_keyGetFunction) {
				keyGetFunction = _keyGetFunction;
			},
			getExistingKey: function (keyid) {
				if (!keyStore.upload.isKeyLoaded(keyid)) {
					return;
				}

				var key = symKeys[keyid] || cryptKeys[keyid] || signKeys[keyid];
				return key.getUploadData(true);
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

				dirtyKeys.filter(function (key) {
					return allowed.indexOf(key.getRealID()) !== -1;
				}).forEach(function (key) {
					var decryptors = key.getDecryptorData();

					if (allowedEncryptors) {
						decryptors = decryptors.filter(function (decryptor) {
							return allowedEncryptors.indexOf(decryptor.decryptorid) !== -1;
						});
					}

					addKeyDecryptors[key.getRealID()] = decryptors;
				});

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
				return waitForReady.async().then(function () {
					var res = chelper.bits2hex(sjcl.random.randomWords(Math.ceil(length/8)));
					return res.substr(0, length);
				}).nodeify(cb);
			},
			words: function (number, cb) {
				return waitForReady.async().then(function () {
					return sjcl.random.randomWords(number);
				}).nodeify(cb);
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
				return waitForReady.async().then(function () {
					return SymKey.generate(undefined, comment);
				}).then(function (key) {
					return key.getRealID();
				}).nodeify(callback);
			},

			createBackupKey: function (realID, callback) {
				/* two keys: key1 -> key2 -> main
				* key2 is on the server
				* key1 is downloaded/printed
				* server never distributes key2 except when advised to do so (manually for now!)
				*/
				var backupKey, outerBackupKey, toBackupKey;

				return waitForReady.async().then(function () {
					return SymKey.get(realID);
				}).then(function (_toBackupKey) {
					toBackupKey = _toBackupKey;
					outerBackupKey = sjcl.random.randomWords(8);
					backupKey = new SymKey(sjcl.random.randomWords(8));

					makeKeyUsableForEncryption(backupKey.getRealID());
					makeKeyUsableForEncryption(new SymKey(outerBackupKey).getRealID());

					return Bluebird.all([
						toBackupKey.addSymDecryptor(backupKey),
						backupKey.addSymDecryptor(new SymKey(outerBackupKey))
					]);
				}).then(function () {
					var decryptorsAdded = keyStore.upload.getDecryptors([toBackupKey.getRealID()], [backupKey.getRealID()]);
					var backupKeyData = backupKey.getUploadData();

					backupKeyData.decryptors[0].type = "backup";

					return {
						decryptors: decryptorsAdded,
						innerKey: backupKeyData,
						outerKey: outerBackupKey
					};
				}).nodeify(callback);
			},

			loadBackupKey: function (outerBackupKey) {
				var key = new SymKey(outerBackupKey);
				if (!symKeys[key.getRealID()]) {
					symKeys[key.getRealID()] = key;
				} else {
					throw new errors.SecurityError("Key already exists in symKey database (double add?)");
				}

				recovery = true;

				return key.getRealID();
			},

			/** encrypt key with sym key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			symEncryptKey: function symEncryptKeyF(realID, parentKeyID, callback) {
				return SymKey.get(realID).then(function (key) {
					return key.addSymDecryptor(parentKeyID);
				}).nodeify(callback);
			},

			/** encrypt this key with an asymmetric key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			asymEncryptKey: function asymEncryptKeyF(realID, parentKeyID, callback) {
				//ensure the key exists first!
				return SymKey.get(realID).then(function () {
					return CryptKey.get(parentKeyID);
				}).then(function (key) {
					return key.kem();
				}).then(function (parentRealID) {
					return keyStore.sym.symEncryptKey(realID, parentRealID);
				}).nodeify(callback);
			},

			/** encrypt key with password
			* @param realID key to encrypt
			* @param password password to encrypt with
			* @param callback callback
			*/
			pwEncryptKey: function pwEncryptKeyF(realID, password, callback) {
				return SymKey.get(realID).then(function (key) {
					return key.addPWDecryptor(password);
				}).nodeify(callback);
			},

			/** encrypt text with this key.
			* @param text text to encrypt
			* @param realKeyID key to encrypt with
			* @param callback callback
			*/
			encryptText: function (text, realKeyID, callback) {
				return SymKey.get(realKeyID).then(function (key) {
					return key.encryptWithPrefix("data::", text);
				}).nodeify(callback);
			},

			/** encrypt an object
			* @param object Object to encrypt
			* @param realKeyID key to encrypt with
			* @param callback callback
			*/
			encryptObject: function (object, realKeyID, depth, callback) {
				if (object.iv) {
					throw new errors.InvalidDataError("IV already set.");
				}

				return SymKey.get(realKeyID).then(function (key) {
					return new ObjectCryptor(key, depth, object).encrypt();
				}).nodeify(callback);
			},

			decryptObject: function (cobject, depth, callback, key) {
				return SymKey.get(key || mainKey).then(function () {
					return new ObjectCryptor(key, depth, cobject).decrypt();
				}).nodeify(callback);
			},

			/** decrypt an encrypted text
			* @param ctext text to decrypt
			* @param realKeyID key to decrypt with
			* @param callback callback
			*/
			decryptText: function (ctext, realKeyID, callback) {
				return SymKey.get(realKeyID).then(function (key) {
					return key.decrypt(ctext);
				}).then(function (decryptedData) {
					return sjcl.codec.utf8String.fromBits(removeExpectedPrefix(decryptedData, "data::"));
				}).nodeify(callback);
			},

			encryptArrayBuffer: function (buf, realKeyID, callback, progressCallback) {
				return SymKey.get(realKeyID).then(function (key) {
					return key.encryptWithPrefix("buf::", buf, progressCallback, true);
				}).then(function (result) {
					result.iv = sjcl.codec.arrayBuffer.fromBits(result.iv, false);
					result.ct.tag = sjcl.codec.arrayBuffer.fromBits(result.ct.tag, false);
					return h.concatBuffers(result.iv, result.ct.ciphertext_buffer, result.ct.tag);
				}).nodeify(callback);
			},

			decryptArrayBuffer: function (buf, realKeyID, callback) {
				return SymKey.get(realKeyID).then(function (key) {
					var buf32 = new Uint32Array(buf);

					var decr = {
						iv: sjcl.codec.arrayBuffer.toBits(new Uint32Array(buf32.subarray(0, 4)).buffer),
						ct: new Uint32Array(buf32.subarray(4, buf32.byteLength/4-2)).buffer,
						tag: sjcl.codec.arrayBuffer.toBits(new Uint32Array(buf32.subarray(buf32.byteLength/4-2)).buffer)
					};

					return key.decrypt(decr);
				}).then(function (decryptedData) {
					return removeExpectedPrefix(decryptedData, "buf::");
				}).nodeify(callback);
			},

			decryptBigBase64: function (bin, realKeyID, callback) {
				return SymKey.get(realKeyID).then(function (key) {
					bin = sjcl.codec.base64.toBits(bin);

					var decr = {
						iv: sjcl.bitArray.bitSlice(bin, 0, 32*4),
						ct: sjcl.bitArray.bitSlice(bin, 32*4)
					};

					return key.decrypt(decr);
				}).then(function (decryptedData) {
					return sjcl.codec.base64.fromBits(removeExpectedPrefix(decryptedData, "bin::"));
				}).nodeify(callback);
			}
		},

		asym: {
			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback, comment) {
				return CryptKey.generate("256", undefined, comment).then(function (key) {
					return key.getRealID();
				}).nodeify(callback);
			},

			/** encrypt key with sym key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			symEncryptKey: function symEncryptKeyF(realID, parentKeyID, callback) {
				return CryptKey.get(realID).then(function (key) {
					return key.addSymDecryptor(parentKeyID);
				}).nodeify(callback);
			},

			/** encrypt key with password
			* @param realID key to encrypt
			* @param password password to encrypt with
			* @param callback callback
			*/
			pwEncryptKey: function pwEncryptKeyF(realID, password, callback) {
				return CryptKey.get(realID).then(function (key) {
					return key.addPWDecryptor(password);
				}).nodeify(callback);
			},

			fingerPrintKey: function (realID, cb) {
				return CryptKey.get(realID).then(function (key) {
					return key.getFingerPrint();
				}).nodeify(cb);
			}
		},

		sign: {
			/** generate a key
			* @param callback callback
			*/
			generateKey: function generateKeyF(callback, comment) {
				return SignKey.generate("256", undefined, comment).then(function (key) {
					return key.getRealID();
				}).nodeify(callback);
			},

			/** encrypt key with sym key
			* @param realID key to encrypt
			* @param parentKeyID key to encrypt with
			* @param callback callback
			*/
			symEncryptKey: function symEncryptKeyF(realID, parentKeyID, callback) {
				return SignKey.get(realID).then(function (key) {
					return key.addSymDecryptor(parentKeyID);
				}).nodeify(callback);
			},

			/** encrypt key with password
			* @param realID key to encrypt
			* @param password password to encrypt with
			* @param callback callback
			*/
			pwEncryptKey: function pwEncryptKeyF(realID, password, callback) {
				return SignKey.get(realID).then(function (key) {
					return key.addPWDecryptor(password);
				}).nodeify(callback);
			},

			signObject: function (object, realID, version, callback) {
				return Bluebird.all([
					SignKey.get(realID),
					sjclWorkerInclude.stringify(object, version, true)
				]).spread(function (key, hash) {
					return key.sign(hash, object._type);
				}).then(function (signature) {
					return chelper.bits2hex(signature);
				}).nodeify(callback);
			},

			verifyObject: function (signature, object, realID, version, id) {
				signature = chelper.hex2bits(signature);

				var getSignKey = Bluebird.promisify(SignKey.get, SignKey);

				return Bluebird.all([
					stringifyObject(object, version),
					getSignKey(realID)
				]).spread(function (objectString, key) {
					return key.verify(signature, objectString, object._type, id);
				}).catch(function (e) {
					console.error(e);

					return false;
				});
			},

			fingerPrintKey: function (realID, cb) {
				return CryptKey.get(realID).then(function (key) {
					return key.getFingerPrint();
				}).nodeify(cb);
			}
		}
	};

	return keyStore;
});
