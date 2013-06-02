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
define(["libs/step", "asset/helper", "crypto/helper", "libs/sjcl", "crypto/sjclWorkerInclude"], function (step, h, chelper, sjcl) {
	"use strict";
	var symKeys = {};
	var cryptKeys = {};
	var signKeys = {};
	var passwords = [];

	var SymKey;
	var CryptKey;

	var keyGenIdentifier = "";

	//TODO: webworkers: var webWorker = Modernizr.webworkers;

	function generateid() {
		return keyGenIdentifier + ":" + chelper.bits2hex(sjcl.hash.sha256.hash(new Date().getTime()));
	}

	function encryptPW(pw, text, callback) {
		step(function () {
			var result = sjcl.encrypt(pw, text);
			this.ne(sjcl.json.decode(result));
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
		var dirtyDecryptors;
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
				dirtyDecryptors.push(decryptorData);

				this.ne();
			}, callback);
		}

		function addSymDecryptorF(realid, callback) {
			var cryptor;
			step(function () {
				SymKey.get(realid, this);
			}, h.sF(function (theKey) {
				cryptor = theKey;
				theKey.decryptKey(this);
			}), h.sF(function () {
				cryptor.encrypt("key::" + internalSecret, this);
			}), h.sF(function (data) {
				var decryptorData = {
					decryptorid: 0,
					type: "symKey",
					id: realid,
					ct: data.ct,
					iv: data.iv,
					dirty: true
				};

				decryptors.push(decryptorData);
				dirtyDecryptors.push(decryptorData);

				this.ne();
			}), callback);
		}

		function addPWDecryptorF(pw, callback) {
			step(function () {
				encryptPW(pw, internalSecret, this);
			}, h.sF(function (data) {
				data = sjcl.json.decode(data);
				var decryptorData = {
					decryptorid: 0,
					type: "pw",
					//Think, shortHash here? id: realid,
					ct: data.ct,
					iv: data.iv,
					salt: data.salt,
					dirty: true
				};

				decryptors.push(decryptorData);
				dirtyDecryptors.push(decryptorData);

				this.ne();
			}), callback);
		}

		this.addAsymDecryptor = addAsymDecryptorF;
		this.addSymDecryptor = addSymDecryptorF;
		this.addPWDecryptor = addPWDecryptorF;

		function getUploadDataF() {
			//TODO
			//upload the decryptors of this key.
			//this will be called in the keys upload() function.
		}
		this.getUploadData = getUploadDataF;

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
				intKey = new Key(generateid(), [], {secret: chelper.hex2bits(keyData)});
			} else {
				intKey = new Key(keyData.realid, keyData.decryptors);
			}
		} else {
			intKey = new Key(generateid(), [], {secret: sjcl.random.randomWords(8)});
		}

		this.getRealid = intKey.getRealid;
		this.getDecryptors = intKey.getDecryptors;

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

	function makeSymKey(keyData) {
		if (keyData && keyData.realid) {
			if (!symKeys[keyData.realid]) {
				var key = new SymKey(keyData);
				symKeys[keyData.realid] = key;
			}

			return symKeys[keyData.realid];
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

	function symKeyGenerate(callback) {
		step(function () {
			this.ne(new SymKey());
		}, callback);
	}

	SymKey.get = symKeyGet;
	SymKey.generate = symKeyGenerate;

	CryptKey = function (keyData) {
		var publicKey;
		var intKey;

		var isPrivateKey = false;

		if (!keyData || !keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid || !keyData.id) {
			throw "invalid data";
		}

		var curve = chelper.getCurve(keyData.curve);

		var x =	curve.field(keyData.x);
		var y = curve.field(keyData.y);
		var point = new sjcl.ecc.point(curve, x, y);

		publicKey = new sjcl.ecc.elGamal.publicKey(curve, point);

		var realid = keyData.realid;

		if (keyData.exponent) {
			isPrivateKey = true;
			realid = generateid();

			intKey = new Key(realid, keyData.decryptors, {
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
			intKey = new Key(realid, keyData.decryptors, {
				postProcessor: function cryptKeyPostProcessor(secret, callback) {
					step(function () {
						var exponent = new sjcl.bn(secret);

						this.ne(new sjcl.ecc.elGamal.privateKey(curve, exponent));
					}, callback);
				}
			});
		}

		if (isPrivateKey) {
			this.decrypted = intKey.decrypted;
			this.decryptKey = intKey.decryptKey;

			this.getRealid = intKey.getRealid;
			this.getDecryptorsF = intKey.getDecryptors;
		}

		function kemF(callback) {
			var resultKey;
			step(function () {
				this.ne(publicKey.kem());
			}, h.sF(function (keyData) {
				resultKey = new SymKey(keyData.key);
				resultKey.addAsymDecryptor(keyData.tag, this);
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

				this.ne(intKey.getSecret().unkem(tag));
			}), callback);
		}

		this.kem = kemF;

		if (isPrivateKey) {
			this.unkem = unkemF;
		}
	};

	function cryptKeyGet(realKeyid, callback) {
		//TODO
	}

	function cryptKeyGenerate(curve, callback) {
		step(function () {
			//TODO
		});
	}

	CryptKey.get = cryptKeyGet;
	CryptKey.generate = cryptKeyGenerate;

	var SignKey = function (keyData) {
		var publicKey;
		var intKey;

		var isPrivateKey = false;

		if (!keyData.point || !keyData.point.x || !keyData.point.y || !keyData.curve || !keyData.realid || !keyData.id) {
			throw "invalid data";
		}

		if (!keyData.decryptors && !keyData.exponent) {
			throw "invalid data";
		}

		var curve = chelper.getCurve(keyData.curve);

		var x =	curve.field(keyData.x);
		var y = curve.field(keyData.y);
		var point = new sjcl.ecc.point(curve, x, y);

		publicKey = new sjcl.ecc.elGamal.publicKey(curve, point);

		var realid = keyData.realid;

		//add exponent/decryptors
		if (keyData.exponent) {
			isPrivateKey = true;
			realid = generateid();

			intKey = new Key(realid, keyData.decryptors, {
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
			intKey = new Key(realid, keyData.decryptors, {
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

			this.getRealid = intKey.getRealid;
			this.getDecryptorsF = intKey.getDecryptors;
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

	function signKeyGet(realKeyid, callback) {

	}

	function signKeyGenerate(curve) {

	}

	SignKey.get = signKeyGet;
	SignKey.generate = signKeyGenerate;

	var keyStore = {
		SymKey: SymKey,

		reset: function reset() {
			symKeys = {};
			cryptKeys = {};
			signKeys = {};
			passwords = [];
		},

		setKeyGenIdentifier: function (identifier) {
			keyGenIdentifier = identifier;
		},

		sym: {
			//TODO: rethink interface. do we want to have generateKey and then encryptKeySym, encryptKeyAsym, encryptKeyPW or somewhat different?
			generateSymEncryptedKey: function (parentKeyIDs, callback) {
				var cryptKey;

				step(function () {
					SymKey.generateKey(this);
				}, callback);
			},
			generateAsymEncryptedKey: function (parentKeyID, callback) {

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
			generateSymEncryptedKey: function (realKeyID, parentKeyIDs, callback) {
				var signKey, parentKey;
				step(function () {
					SignKey.generate(this);
				}, h.sF(function (key) {
					signKey = key;
					SymKey.get(parentKeyIDs, this);
				}), h.sF(function (key) {
					parentKey = key;
					parentKey.decryptKey(this);
				}), h.sF(function () {
					signKey.encryptSym(parentKey);
				}));
			},
			generatePWEncryptedKey: function (password, callback) {
				step(function () {
					SignKey.generate(this);
				}, h.sF(function (key) {

				}));
			},
			sign: function (text, keyid, callback) {

			},
			verify: function (signature, text, keyid, callback) {

			}
		}
	};


	return keyStore;
});