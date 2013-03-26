/** our keystore.
	handles all the keys, passwords, etc.
	keys are a little difficult because some keys look different but are the same because they are encrypted differently
	also keys always have a decryptor because the are never distributed alone.
**/
define(["libs/step", "asset/helper"], function (step, h) {
	"use strict";
	var symKeys = {};
	var asymKeys = {};
	var passwords = [];

	var symKey = {
		fetch: function (keyid, callback) {

		}
	};


	function asymKeyFetch(keyid, callback) {

	}
	
	function asymKeyGenerate() {
	
	}
	
	var asymKey = function (keydata) {
		function decryptF() {
		
		}

		this.decrypt = decryptF;
	};

	asymKey.fetch = asymKeyFetch;
	asymKey.generate = asymKeyGenerate;

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
				sjclWorker.generateAsymCryptKey();
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