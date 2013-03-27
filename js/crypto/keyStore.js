/** our keystore.
	handles all the keys, passwords, etc.
	keys are a little difficult because some keys look different but are the same because they are encrypted differently
	also keys always have a decryptor because the are never distributed alone.
**/
define(["libs/step", "asset/helper", "crypto/helper", "libs/sjcl", "crypto/sjclWorkerInclude"], function (step, h, chelper, sjcl, sjclWorkerInclude) {
	"use strict";
	var symKeys = {};
	var asymKeys = {};
	var passwords = [];

	var symKey = function (keydata) {

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
			generateKey: function () {
				sjclWorkerInclude.generateAsymCryptKey();
			},
			symEncryptKey: function (realKeyID, parentKeyIDs) {

			},
			asymEncryptKey: function (realKeyID, parentKeyIDs) {

			},
			generatePWEncryptedKey: function (password) {

			},
			encrypt: function (text, keyID) {

			},
			decrypt: function (ctext, keyID) {

			}
		},

		sign: {
			generateKey: function () {

			}
		}
	};


	return keyStore;
});