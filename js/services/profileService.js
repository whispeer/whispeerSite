/**
* ProfileService
**/
define(["crypto/keyStore", "step", "whispeerHelper", "valid/validator"], function (keyStore, step, h, validator) {
	"use strict";

	var service = function () {
		function checkValid(data, checkValues) {
			if (checkValues) {
				return validator.validate("profile", data);
			} else {
				return validator.validateEncrypted("profile", data);
			}
		}

		//where should the key go? should it be next to the data?
		var profileService = function (data) {
			var dataEncrypted, dataDecrypted, decrypted, signature, id, err, decrypting = false;
			var theProfile = this;

			if (typeof data.key === "object") {
				data.key = keyStore.upload.addKey(data.key);
			}

			if (data.iv) {
				dataEncrypted = data;
				decrypted = false;

				err = checkValid(data, false);
				if (err) {
					throw err;
				}
			} else {
				dataDecrypted = data;
				decrypted = true;

				err = checkValid(data, true);
				if (err) {
					throw err;
				}
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
				if (decrypted) {
					callback(null, dataDecrypted);
					return;
				}
				step(function () {
					if (decrypting) {
						theProfile.bind("decrypted", callback);
						return;
					}

					decrypting = true;
					keyStore.sym.decryptObject(data, this);
				}, h.sF(function (result) {
					dataDecrypted = result;
					decrypted = true;
					
					err = checkValid(data, true);
					if (err) {
						throw err;
					}

					jQuery(theProfile).trigger("decrypted", dataDecrypted);

					this.ne(result);
				}), callback);
			};
		};

		return profileService;
	};

	service.$inject = [];

	return service;
});