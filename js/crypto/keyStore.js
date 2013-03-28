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

	var webWorker = Modernizr.webworkers;

	function internalDecrypt(decryptorid, decryptortype, ctext, callback, iv, salt) {

	}

	var symKey = function (keydata) {
		var realid = keydata.realid;
		var instid = keydata.id;

		var decrypted = false;

		var ct = keydata.ct;
		var iv = keydata.iv;
		var salt = keydata.salt;

		var decryptorid = keydata.decryptorid;
		var decryptortype = keydata.decryptortype;

		var key;

		function encryptF(text, callback, iv) {
			step(function () {
				if (!decrypted) {
					throw "not yet decrypted";
				}

				var result;
				if (iv) {
					result = sjcl.encrypt(key, text, {"iv": iv});
				} else {
					result = sjcl.encrypt(key, text);
				}

				this.ne(result);
			}, callback);
		}

		function decryptF(ctext, callback, iv, salt) {
			step(function () {
				if (!decrypted) {
					throw "not yet decrypted";
				}

				var result;

				var options = {};
				if (iv) {
					options.iv = iv;
				}

				if (salt) {
					options.salt = salt;
				}

				result = sjcl.decrypt(key, ctext, options);

				this.ne(result);
			}, callback);
		}

		this.encrypt = encryptF;
		this.decrypt = decryptF;

		function decryptedF() {
			return decrypted;
		}

		function decryptKeyF(callback) {
			step(function () {
				internalDecrypt(decryptorid, decryptortype, ct, this, iv, salt);
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
	};

	function symKeyFetch(keyid, callback) {

	}

	function symKeyGenerate() {

	}

	symKey.fetch = symKeyFetch;
	symKey.generate = symKeyGenerate;

	function cryptKeyFetch(keyid, callback) {

	}

	function cryptKeyGenerate(curve) {

	}

	var cryptKey = function (keydata) {
		function decryptF() {

		}

		function encryptF() {

		}

		this.decrypt = decryptF;
		this.encrypt = encryptF;
	};

	cryptKey.fetch = cryptKeyFetch;
	cryptKey.generate = cryptKeyGenerate;

	var signKey = function (keydata) {
		var publicKey;
		var privateKey;

		var isPrivateKey = false;
		var decrypted;

		if (!keydata.point || !keydata.point.x || !keydata.point.y || !keydata.curve) {
			throw "invalid data";
		}

		if (keydata.exponent) {
			privateKey = true;
			decrypted = false;
		}

		var curve = chelper.getCurve(keydata.curve);

		var x =	curve.field(keydata.x);
		var y = curve.field(keydata.y);
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

		function signF(hash, callback) {

		}

		function verifyF(signature, hash, callback) {

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
			generateKey: function (parentKeyID, callback) {
				var cryptKey;

				step(function () {
					symKey.generateKey(this);
				}, callback);
			},
			symEncryptKey: function (realKeyID, parentKeyIDs) {

			},
			asymEncryptKey: function (realKeyID, parentKeyIDs) {

			},
			generatePWEncryptedKey: function (password) {

			},
			encrypt: function (text, realKeyID) {

			},
			decrypt: function (ctext, realKeyID) {

			}
		},

		asym: {
			generateKey: function (callback, important) {
				cryptKey.generate(callback);
			},
			symEncryptKey: function (realKeyID, parentKeyIDs, callback) {

			},
			asymEncryptKey: function (realKeyID, parentKeyIDs, callback) {

			},
			generatePWEncryptedKey: function (password, callback) {

			},
			encrypt: function (text, keyID, callback) {

			},
			decrypt: function (ctext, keyID, callback) {

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
			asymEncryptKey: function (realKeyID, parentKeyIDs, callback) {

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