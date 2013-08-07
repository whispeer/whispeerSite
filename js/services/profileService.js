/**
* ProfileService
**/
define(["crypto/keyStore", "step", "whispeerHelper", "valid/validator"], function (keyStore, step, h, validator) {
	"use strict";

	var service = function () {
		var validAttributes = {
			iv: h.isHex,
			key: h.isRealID,
			profileid: h.isInt,
			signature: h.isHex,
			basic: {
				iv: false,
				firstname: true,
				lastname: true,
				birthday: function (val) {
					if (isNaN(Date.parse(val))) {
						return false;
					}

					return true;
				}
			}
		};

		function checkValid(data, checkValues) {
			if (!h.validateObjects(validAttributes, data, !checkValues)) {
				throw "not a valid profile";
			}
		}

		//where should the key go? should it be next to the data?
		var profileService = function (data) {
			var dataEncrypted, dataDecrypted, decrypted, signature, id;
			var theProfile = this;

			if (data.iv) {
				dataEncrypted = data;
				decrypted = false;

				checkValid(data, false);
			} else {
				dataDecrypted = data;
				decrypted = true;

				checkValid(data, true);
			}

			if (data.signature) {
				signature = data.signature;
				delete data.signature;
			}

			if (data.profileid) {
				id = data.profileid;
				delete data.profileid;
			}

			this.sign = function signprofileF(key, callback) {
				step(function () {
					keyStore.sign.signObject(data, key, this);
				}, h.sF(function (result) {
					signature = result;
					this.ne(result);
				}), callback);
			};

			this.signAndEncrypt = function signAndEncryptF(signKey, cryptKey, cb) {
				step(function () {
					theProfile.encrypt(cryptKey, this.parallel());
					theProfile.sign(signKey, this.parallel());
				}, h.sF(function (data) {
					data[0].signature = data[1];

					this.ne(data[0]);
				}), cb);
			};

			this.encrypt = function encryptProfileF(key, callback) {
				step(function () {
					keyStore.sym.encryptObject(data, key, this);
				}, h.sF(function (result) {
					dataEncrypted = result;
					this.ne(result);
				}), callback);
			};

			this.decrypt = function decryptProfileF(callback) {
				step(function () {
					keyStore.sym.decryptObject(data, this);
				}, h.sF(function (result) {
					dataDecrypted = result;
					decrypted = true;
					checkValid(data, true);
					this.ne(result);
				}), callback);
			};
		};

		return profileService;
	};

	service.$inject = [];

	return service;
});