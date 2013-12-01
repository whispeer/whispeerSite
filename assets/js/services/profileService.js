/**
* ProfileService
**/
define(["crypto/keyStore", "step", "whispeerHelper", "valid/validator", "asset/Observer"], function (keyStore, step, h, validator, Observer) {
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
			var dataEncrypted, dataDecrypted = {}, decrypted, signature, id, err, decrypting = false, verified = false;
			var theProfile = this;

			/*
				-> reserved word hash
				-> if property is not an object assume it is a hash
				hashObject:
				{
					hash: "hash of whole object",
					name: {
						hash: "hash of name",
						----possibility1----
						firstname: {
							hash: "hash of firstname"
						}
						----possibility2----
						firstname: "hash of firstname"
					}
				}
			*/

			if (typeof data.key === "object") {
				data.key = keyStore.upload.addKey(data.key);

				dataEncrypted = data;
				decrypted = false;
			} else {
				dataDecrypted = data;
				decrypted = true;
			}

			err = checkValid(data, decrypted);

			if (err) {
				throw err;
			}

			if (data.signature) {
				signature = data.signature;
				delete data.signature;
			}

			if (data.profileid) {
				id = data.profileid;
				delete data.profileid;
			}

			this.verify = function verifyProfileF(key, cb) {
				if (verified) {
					cb(null, verified);
					return;
				}

				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function () {
					keyStore.sign.verifyObject(signature, dataDecrypted, key, this);
				}), h.sF(function (valid) {
					if (valid) {
						verified = true;
					} else {
						h.setAll(dataDecrypted, "Security Breach!");
					}
				}), cb);
			};

			this.sign = function signprofileF(key, cb) {
				step(function () {
					keyStore.sign.signObject(data, key, this);
				}, h.sF(function (result) {
					signature = result;
					this.ne(result);
				}), cb);
			};

			this.signAndEncrypt = function signAndEncryptF(signKey, cryptKey, cb) {
				step(function () {
					this.parallel.unflatten();

					theProfile.encrypt(cryptKey, this.parallel());
					theProfile.sign(signKey, this.parallel());
				}, h.sF(function (encryptedProfile, signature) {
					encryptedProfile.signature = signature;

					this.ne(encryptedProfile);
				}), cb);
			};

			this.encrypt = function encryptProfileF(key, cb) {
				step(function () {
					keyStore.sym.encryptObject(data, key, 1, this);
				}, h.sF(function (result) {
					dataEncrypted = result;
					dataEncrypted.key = key;

					this.ne(result);
				}), cb);
			};

			this.setAttribute = function setAttributeF(attrs, value, cb) {
				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					h.deepSet(dataDecrypted, attrs, value);
					this.ne();
				}), cb);
			};

			this.getAttribute = function getAttributeF(attrs, cb) {
				if (decrypted) {
					cb(null, h.deepGet(dataDecrypted, attrs));
					return;
				}

				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					this.last.ne(h.deepGet(dataDecrypted, attrs));
				}), cb);
			};

			this._decryptBranch = function decryptBranch(cb, branch) {
				step(function checkAlreadyDecrypted() {
					if (decrypted[branch]) {
						this.last.ne();
					} else {
						this.ne();
					}
				}, h.sF(function checkEmpty() {
					if (dataEncrypted[branch]) {
						keyStore.sym.decryptObject(dataEncrypted[branch], 0, this);
					} else {
						decrypted[branch] = true;
						this.last.ne();
					}
				}), h.sF(function decryptedBranch(decrypted) {
					dataDecrypted[branch] = decrypted;
					decrypted[branch] = true;

					delete dataEncrypted[branch];

					this.last.ne();
				}), function (e) {
					theProfile.notify("", "decrypted");

					decrypting = false;
					cb(e);
				});
			};

			this._decryptFull = function decryptFullF(cb) {
				step(function () {
					keyStore.sym.decryptObject(data, 1, this);
				}, h.sF(function (result) {
					var attr;
					for (attr in result) {
						if (result.hasOwnProperty(attr)) {
							dataDecrypted[attr] = result[attr];
						}
					}

					decrypted = true;
					
					err = checkValid(data, true);
					if (err) {
						throw err;
					}

					theProfile.notify("", "decrypted");

					this.ne(result);
				}), cb);
			};

			this.decrypt = function decryptProfileF(cb, branch) {
				if (decrypted === true) {
					cb();
					return;
				}

				if (decrypting) {
					theProfile.listenOnce(function () {
						theProfile.decrypt(cb, branch);
					}, "decrypted");
				} else {
					decrypting = true;
					if (branch) {
						this.decryptBranch(cb, branch);
					} else {
						this.decryptFully(cb);
					}
				}
			};

			Observer.call(this);
		};

		return profileService;
	};

	service.$inject = [];

	return service;
});