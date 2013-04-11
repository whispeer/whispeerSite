/** our keystore.
	handles all the keys, passwords, etc.
	keys are a little difficult because some keys look different but are the same because they are encrypted differently
	also keys always have a decryptor because the are never distributed alone.

	keyid: identifier@timestamp
**/
define(["libs/step", "asset/helper", "crypto/helper", "libs/sjcl", "crypto/sjclWorkerInclude"], function (step, h, chelper, sjcl) {
	"use strict";
	var symKeys = {};
	var cryptKeys = {};
	var signKeys = {};
	var passwords = [];

	var SymKey;
	var CryptKey;

	var keyGenIdentifier = "";

	this.setKeyGenIdentifier = function (identifier) {
		this.keyGenIdentifier = identifier;
	};

	//TODO: webworkers: var webWorker = Modernizr.webworkers;

	function generateid() {
		return keyGenIdentifier + ":" + chelper.hex2bits(sjcl.hash.sha256.hash(new Date().getTime()));
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
					var jsonData = JSON.stringify({
						ct: ctext,
						iv: iv,
						salt: salt
					});
					var i;
					for (i = 0; i < passwords.length; i += 1) {
						try {
							var result = sjcl.decrypt(passwords[i], jsonData);
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
	var Key = function keyConstructor(realid, decryptors, optionals) {
		var internalSecret;

		function pastProcessor(secret, callback) {
			callback(null, secret);
		}

		var decrypted = false;
		var theKey = this;

		optionals = optionals || {};

		if (optionals.secret) {
			internalSecret = optionals.secret;
			decrypted = true;
		}

		if (typeof optionals.pastProcessor === "function") {
			pastProcessor = optionals.pastProcessor;
		}

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
				}

				usedDecryptor = theKey.getFastestDecryptor();

				if (!usedDecryptor) {
					this.last.ne(false);
				}

				internalDecrypt(usedDecryptor.decryptorid, usedDecryptor.decryptortype, usedDecryptor.ct, this, usedDecryptor.iv, usedDecryptor.salt);
			}, function (err, result) {
				if (err || result === false) {
					var i;
					for (i = 0; i < decryptors.length; i += 1) {
						if (decryptors[i] === usedDecryptor) {
							decryptors.splice(i, 1);
							//TODO: remove
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
		function getRealidF() {
			return realid;
		}

		this.getRealid = getRealidF;

		/** getter for decryptors array
		* copies array before returning
		*/
		function getDecryptorsF() {
			var result;

			var i, tempR, k;
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
			var MAXSPEED = 99999999999;
			if (!level) {
				level = 0;
			}

			if (level > 100) {
				console.log("dafuq, deeply nested keys");
				return MAXSPEED;
			}

			var speeds = {
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

			var i, cur, key, decryptorIndex = 0, smallest = MAXSPEED, subKeyData, speed, curSpeeds;
			for (i = 0; i < decryptors.length; i += 1) {
				cur = decryptors[i];
				curSpeeds = speeds[cur.decryptortype];

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

		function uploadAsymEncryptedF(realid, tag, callback) {
			var decryptorData;
			step(function () {
				decryptorData = {
					type: "asymKey",
					id: realid,
					ct: chelper.bits2hex(tag)
				};
				h.get({
					addKey: {
						realid: realid,
						decryptor: decryptorData
					}
				}, this);
			}, h.sF(function (data) {
				decryptorData.decryptorid = data.addKey.id;
				this.decryptors.push(decryptorData);
			}), callback);
		}

		this.uploadAsymEncrypted = uploadAsymEncryptedF;

		/** encrypt and upload */
		function uploadSymEncryptedF(symKeyID, callback) {
			var cryptor, decryptorData;
			step(function () {
				SymKey.get(symKeyID, this);
			}, h.sF(function (theKey) {
				cryptor = theKey;
				theKey.decryptKey(this);
			}), h.sF(function () {
				cryptor.encrypt("key::" + internalSecret, this);
			}), h.sF(function (ctext, iv) {
				decryptorData = {
					type: "symKey",
					id: cryptor.getRealid(),
					ct: ctext,
					iv: iv
				};
				h.get({
					addKey: {
						realid: realid,
						decryptor: decryptorData
					}
				}, this);
			}), h.sF(function (data) {
				decryptorData.decryptorid = data.addKey.id;
				this.decryptors.push(decryptorData);
			}), callback);
		}

		this.uploadSymEncrypted =  uploadSymEncryptedF;

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
				intKey = new Key(generateid(), [], chelper.hex2bits(keyData));
			} else {
				intKey = new Key(keyData.realid, keyData.decryptors);
			}
		} else {
			intKey = new Key(generateid(), [], sjcl.random.randomWords(8));
		}

		this.getRealid = intKey.getRealid;
		this.getDecryptors = intKey.getDecryptors;

		this.uploadEncrypted = intKey.uploadSymEncrypted;

		this.decrypted = intKey.decrypted;
		this.decryptKey = intKey.decryptKey;

		this.getFastestDecryptor = intKey.getFastestDecryptor;

		/** encrypt a text.
		* @param text text to encrypt
		* @param callback called with result
		* @param optional iv initialization vector
		*/
		function encryptF(text, callback, iv) {
			step(function () {
				if (!intKey.decrypted()) {
					throw "not yet decrypted";
				}

				//TODO: use worker
				var result;
				if (iv) {
					result = sjcl.encrypt(intKey.getSecret(), text, {"iv": iv});
				} else {
					result = sjcl.encrypt(intKey.getSecret(), text);
				}

				this.ne(result);
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

				var options = {};
				if (iv) {
					options.iv = iv;
				}

				result = sjcl.decrypt(intKey.getSecret(), ctext, options);

				this.ne(result);
			}, callback);
		}

		this.encrypt = encryptF;
		this.decrypt = decryptF;
	};

	//TODO
	function makeSymKey(keyData) {
		if (keyData && keyData.realid) {
			var key = new SymKey(keyData);

			if (!symKeys[key.getRealid()]) {
				symKeys[key.getRealid()] = key;
			}

			return symKeys[key.getRealid()];
		}
	}

	function symKeyGet(realKeyid, callback) {
		step(function checkLoaded() {
			if (symKeys[realKeyid]) {
				this.last.ne(symKeys[realKeyid]);
			} else {
				h.get({
					keychain: {
						loaded: Object.keys(symKeys),
						toget: realKeyid
					}
				}, this);
			}
		}, h.sF(function keyChain(keys) {
			var i;
			for (i = 0; i < keys.length; i += 1) {
				makeSymKey(keys[i]);
			}
			if (symKeys[realKeyid]) {
				this.ne(symKeys[realKeyid]);
			} else {
				throw "keychain not found";
			}
		}), callback);
	}

	function symKeyGenerate() {

	}

	SymKey.get = symKeyGet;
	SymKey.generate = symKeyGenerate;

	CryptKey = function (keyData) {
		var publicKey;
		var privateKey, intKey;

		var isPrivateKey = false;

		if (!keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid || !keyData.id) {
			throw "invalid data";
		}

		var realid = keyData.realid;

		var curve = chelper.getCurve(keyData.curve);

		var x =	curve.field(keyData.x);
		var y = curve.field(keyData.y);
		var point = new sjcl.ecc.point(curve, x, y);

		publicKey = new sjcl.ecc.elGamal.publicKey(curve, point);

		if (keyData.decryptors) {
			isPrivateKey = true;
			intKey = new Key(realid, keyData.decryptors, {
				postProcessor: function cryptKeyPostProcessor(secret, callback) {
					step(function () {
						var exponent = new sjcl.bn(secret);

						this.ne(new sjcl.ecc.elGamal.privateKey(curve, exponent));
					}, callback);
				}
			});

			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getRealid = intKey.getRealid;
			this.getDecryptorsF = intKey.getDecryptors;

			this.uploadEncrypted = intKey.uploadEncrypted;
		}

		function kemF(callback) {
			var resultKey;
			step(function () {
				this.ne(publicKey.kem());
			}, h.sF(function (keyData) {
				resultKey = new SymKey(keyData.key);
				resultKey.uploadAsymEncrypted(keyData.tag, this);
			}), h.sF(function () {
				this.ne(resultKey.realid);
			}), callback);
		}

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

				if (!privateKey) {
					this.last("not a private key");
				}

				this.ne(privateKey.unkem(tag));
			}), callback);
		}

		this.kem = kemF;

		if (isPrivateKey) {
			this.unkem = unkemF;
		}
	};

	function cryptKeyGet(realKeyid, callback) {

	}

	function cryptKeyGenerate(curve) {

	}

	CryptKey.get = cryptKeyGet;
	CryptKey.generate = cryptKeyGenerate;

	var signKey = function (keyData) {
		var publicKey;
		var privateKey, intKey;

		var isPrivateKey = false;

		if (!keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid || !keyData.id) {
			throw "invalid data";
		}

		var realid = keyData.realid;

		if (keyData.decryptors) {
			privateKey = true;
			intKey = new Key(realid, keyData.decryptors);

			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getRealid = intKey.getRealid;
			this.getDecryptorsF = intKey.getDecryptors;

			this.uploadEncrypted = intKey.uploadEncrypted;
		}

		var curve = chelper.getCurve(keyData.curve);

		var x =	curve.field(keyData.x);
		var y = curve.field(keyData.y);
		var point = new sjcl.ecc.point(curve, x, y);

		publicKey = new sjcl.ecc.ecdsa.publicKey(curve, point);

		function signF(hash, callback) {
			step(function () {

			});
		}

		function verifyF(signature, hash, callback) {
			step(function () {

			}, callback);
		}

		if (isPrivateKey) {
			this.sign = signF;
		}

		this.verify = verifyF;
	};

	function signKeyFetch(keyid, callback) {

	}

	function signKeyGenerate(curve) {

	}

	signKey.fetch = signKeyFetch;
	signKey.generate = signKeyGenerate;

	var keyStore = {
		reset: function reset() {
			cryptKeys = {};
			symKeys = {};
			signKeys = {};
			passwords = [];
		},

		sym: {
			generateSymEncryptedKey: function (parentKeyIDs, callback) {
				var cryptKey;

				step(function () {
					SymKey.generateKey(this);
				}, callback);
			},
			generateAsymEncryptedKey: function (parentKeyIDs, callback) {

			},
			generatePWEncryptedKey: function (password, callback) {

			},
			encrypt: function (text, realKeyID, callback) {

			},
			decrypt: function (ctext, realKeyID, callback) {

			}
		},

		asym: {
			generateSymEncryptedKey: function (callback, important) {
				CryptKey.generate(callback);
			},
			generatePWEncryptedKey: function (password, callback) {

			}
		},

		sign: {
			generateKey: function (callback) {
				step(function () {
					signKey.generate(this);
				}, function (theKey) {
					theKey.pushToServer(this);
				}, callback);
			},
			symEncryptKey: function (realKeyID, parentKeyIDs, callback) {

			},
			generatePWEncryptedKey: function (password, callback) {

			},
			sign: function (text, keyid, callback) {

			},
			verify: function (signature, text, keyid, callback) {

			}
		}
	};


	return keyStore;
});