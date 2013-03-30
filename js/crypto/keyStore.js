/** our keystore.
	handles all the keys, passwords, etc.
	keys are a little difficult because some keys look different but are the same because they are encrypted differently
	also keys always have a decryptor because the are never distributed alone.

	keyid: identifier@timestamp
	keyid: get from server
	keyid: get reserved amount from server
**/
define(["libs/step", "asset/helper", "crypto/helper", "libs/sjcl", "crypto/sjclWorkerInclude"], function (step, h, chelper, sjcl, sjclWorkerInclude) {
	"use strict";
	var symKeys = {};
	var asymKeys = {};
	var passwords = [];

	var keyGenIdentifier = "";

	this.setKeyGenIdentifier = function (identifier) {
		this.keyGenIdentifier = identifier;
	};

	var webWorker = Modernizr.webworkers;

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
					symKey.get(decryptorid, this);
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
					cryptKey.get(decryptorid, this);
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

	/** a symkey.
	* @param keyData if not set: generate key; if string: hex of unencrypted key; otherwise: key data
	* @attribute id
	* @attribute realid
	* @attribute decryptor data
	* @attribute encrypted key
	* implements all symmetric key functions.
	*/
	var symKey = function (keyData) {
		var decryptors;

		var realid, instid;
		var decrypted, key;

		if (keyData) {
			if (typeof keyData === "string") {
				realid = generateid();

				decrypted = true;

				key = chelper.hex2bits(keyData);
			} else {
				if (!keyData.ct || !keyData.decryptorid || !keyData.decryptortype || !keyData.realid || !keyData.id) {
					throw "invalid symKey";
				}

				realid = keyData.realid;

				decrypted = false;

				decryptors.push({
					ct: keyData.ct,
					iv: keyData.iv,
					salt: keyData.salt,
					instid: keyData.id,
					id: keyData.decryptorid,
					type: keyData.decryptortype
				});
			}
		} else {
			realid = generateid();

			decrypted = true;

			key = sjcl.random.randomWords(8);
		}

		/** getter for real id */
		function getRealidF() {
			return realid;
		}

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

		this.getRealid = getRealidF;
		this.getDecryptorsF = getDecryptorsF;

		/** encrypt and upload */
		function uploadEncryptedF(symKeyID) {
			var cryptor;
			step(function () {
				symKey.get(symKeyID, this);
			}, h.sF(function (theKey) {
				cryptor = theKey;
				theKey.decryptKey(this);
			}), h.sF(function () {
				cryptor.encrypt("key::" + key);
				//TODO
			}));
		}

		this.uploadEncrypted = uploadEncryptedF;

		/** encrypt a text.
		* @param text text to encrypt
		* @param callback called with result
		* @param optional iv initialization vector
		*/
		function encryptF(text, callback, iv) {
			step(function () {
				if (!decrypted) {
					throw "not yet decrypted";
				}

				//TODO: use worker
				var result;
				if (iv) {
					result = sjcl.encrypt(key, text, {"iv": iv});
				} else {
					result = sjcl.encrypt(key, text);
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
				if (!decrypted) {
					throw "not yet decrypted";
				}

				var result;

				var options = {};
				if (iv) {
					options.iv = iv;
				}

				result = sjcl.decrypt(key, ctext, options);

				this.ne(result);
			}, callback);
		}

		this.encrypt = encryptF;
		this.decrypt = decryptF;

		/** is this key decrypted? */
		function decryptedF() {
			return decrypted;
		}

		/** decrypt this key.
		* @param callback called with true/false
		* searches your whole keyspace for a decryptor and decrypts if possible
		*/
		function decryptKeyF(callback) {
			step(function () {
				//TODO
				//internalDecrypt(decryptorid, decryptortype, ct, this, iv, salt);
			}, function (result) {
				if (result === false) {
					this.ne(false);
				} else {
					key = chelper.hex2bits(result);
					decrypted = true;
					this.ne(true);
				}
			});
		}

		this.decrypted = decryptedF;
		this.decryptKey = decryptKeyF;

		//if we decrypt a key and the decryptor does not work.
		//remove decryptor from set
		
		this.getFastestDecryptorSpeed = function (level) {
			if (!level) {
				level = 0;
			}
		
			if (level > 100) {
				console.log("dafuq, deeply nested keys");
				return 99999;
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
			}

			var i, cur, key, decryptorIndex = 0, smallest = 9999999999;
			for (i = 0; i < decryptor.length; i += 1) {
				cur = decryptor[i];
				
				if (cur.decryptortype === "pw") {
					return speeds[cur.decryptortype];
				} else {
					key = getDecryptor(cur);
					if (key) {
						if (key.decrypted()) {
							speed = speeds[cur.decryptortype].loaded;
						} else {
							speed = speeds[cur.decryptortype].loaded + symKeys[cur.decryptorid].getFastestDecryptorSpeed(level + 1);
						}
					} else {
						speed = speeds[cur.decryptortype].unloaded;
					}
				}

				if (speed < smallest) {
					smallest = speed;
					decryptorIndex = i;
				}
			}

			return smallest;
		}
	};

	//TODO
	function makeSymKey(keyData) {
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

	symKey.get = symKeyGet;
	symKey.generate = symKeyGenerate;

	var cryptKey = function (keyData) {
		var publicKey;
		var privateKey;

		var isPrivateKey = false;
		var decrypted;

		if (!keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid || !keyData.id) {
			throw "invalid data";
		}

		var realid = keyData.realid;
		var instid = keyData.id;

		if (keyData.exponent) {
			privateKey = true;
			decrypted = false;
		}

		var curve = chelper.getCurve(keyData.curve);

		var x =	curve.field(keyData.x);
		var y = curve.field(keyData.y);
		var point = new sjcl.ecc.point(curve, x, y);

		var sjclPubKey = new sjcl.ecc.elGamal.publicKey(curve, point);

		function decryptedF() {
			if (!privateKey) {
				throw "do not call decrypted on public key";
			}

			return decrypted;
		}

		this.decrypted = decryptedF;

		function decryptKeyF() {
			//depends on key encryption type.
		}

		this.decryptKey = decryptKeyF;

		/** getter for real id */
		function getRealidF() {
			return realid;
		}

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

		this.getRealid = getRealidF;
		this.getDecryptorsF = getDecryptorsF;

		/** encrypt and upload */
		function uploadEncryptedF() {
		}

		this.uploadEncrypted = uploadEncryptedF;
		function kemF(callback) {

		}

		function unkemF(tag, callback) {

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

	cryptKey.get = cryptKeyGet;
	cryptKey.generate = cryptKeyGenerate;

	var signKey = function (keyData) {
		var publicKey;
		var privateKey;

		var isPrivateKey = false;
		var decrypted;

		if (!keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid || !keyData.id) {
			throw "invalid data";
		}

		var realid = keyData.realid;
		var instid = keyData.id;

		if (keyData.exponent) {
			privateKey = true;
			decrypted = false;
		}

		var curve = chelper.getCurve(keyData.curve);

		var x =	curve.field(keyData.x);
		var y = curve.field(keyData.y);
		var point = new sjcl.ecc.point(curve, x, y);

		var sjclPubKey = new sjcl.ecc.ecdsa.publicKey(curve, point);

		function decryptedF() {
			if (!privateKey) {
				throw "do not call decrypted on public key";
			}

			return decrypted;
		}

		this.decrypted = decryptedF;

		function decryptKeyF() {
			//depends on key encryption type.
		}

		this.decryptKey = decryptKeyF;

		/** getter for real id */
		function getRealidF() {
			return realid;
		}

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

		this.getRealid = getRealidF;
		this.getDecryptorsF = getDecryptorsF;

		/** encrypt and upload */
		function uploadEncryptedF() {
		}

		this.uploadEncrypted = uploadEncryptedF;

		function signF(hash, callback) {
			step(function () {

			});
		}

		function verifyF(signature, hash, callback) {
			step(function () {

			}, callback);
		}

		this.sign = signF;
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
			asymKeys = {};
			symKeys = {};
			passwords = [];
		},

		sym: {
			generateSymEncryptedKey: function (parentKeyIDs, callback) {
				var cryptKey;

				step(function () {
					symKey.generateKey(this);
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
				cryptKey.generate(callback);
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