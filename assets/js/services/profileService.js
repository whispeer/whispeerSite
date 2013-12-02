/**
* ProfileService
**/
define(["crypto/keyStore", "step", "whispeerHelper", "valid/validator", "asset/Observer"], function (keyStore, step, h, validator, Observer) {
	"use strict";

	var service = function () {
		//where should the key go? should it be next to the data?
		var profileService = function (data, isDecrypted) {
			var encryptedProfile, decryptedProfile = {}, decrypted = {};

			var decrypting = false, verified = false;

			var id, signature;
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

			function checkDecryptedProfile() {
				var err = validator.validate("profile", decryptedProfile);
				if (err) {
					throw err;
				}
			}

			function checkEncryptedProfile() {
				var err = validator.validateEncrypted("profile", encryptedProfile, 1);
				if (err) {
					throw err;
				}
			}

			if (isDecrypted) {
				decrypted = true;
				decryptedProfile = data;

				checkDecryptedProfile();
			} else {
				id = data.profileid;
				signature = data.signature;

				if (typeof data.profile.key === "object") {
					data.profile.key = keyStore.upload.addKey(data.profile.key);
				}
				encryptedProfile = data.profile;

				checkEncryptedProfile();
			}

			signature = data.signature;
			id = data.profileid;

			this.verify = function verifyProfileF(key, cb) {
				if (verified) {
					cb(null, verified);
					return;
				}

				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function () {
					keyStore.sign.verifyObject(signature, decryptedProfile, key, this);
				}), h.sF(function (valid) {
					if (valid) {
						verified = true;
					} else {
						h.setAll(decryptedProfile, "Security Breach!");
					}
				}), cb);
			};

			this.sign = function signprofileF(key, cb) {
				step(function () {
					keyStore.sign.signObject(decryptedProfile, key, this);
				}, h.sF(function (result) {
					signature = result;
					this.ne(result);
				}), cb);
			};

			this.generateHashObject = function generateHashObjectF() {
				return keyStore.hash.deepHashObject(decryptedProfile);
			};

			this.signAndEncrypt = function signAndEncryptF(signKey, cryptKey, cb) {
				step(function () {
					this.parallel.unflatten();

					theProfile.encrypt(cryptKey, this.parallel());
					theProfile.sign(signKey, this.parallel());
				}, h.sF(function (encryptedProfile, signature) {
					var result = {
						profile: encryptedProfile,
						signature: signature,
						hashObject: theProfile.generateHashObject(),
						key: cryptKey
					};

					this.ne(result);
				}), cb);
			};

			this.encrypt = function encryptProfileF(key, cb) {
				step(function () {
					keyStore.sym.encryptObject(data, key, 1, this);
				}, h.sF(function (result) {
					encryptedProfile = result;

					this.ne(result);
				}), cb);
			};

			this.setAttribute = function setAttributeF(attrs, value, cb) {
				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					h.deepSet(decryptedProfile, attrs, value);
					this.ne();
				}), cb);
			};

			this.getAttribute = function getAttributeF(attrs, cb) {
				if (decrypted === true) {
					cb(null, h.deepGet(decryptedProfile, attrs));
					return;
				}

				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					this.last.ne(h.deepGet(decryptedProfile, attrs));
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
					if (encryptedProfile[branch]) {
						encryptedProfile[branch].key = encryptedProfile.key;
						keyStore.sym.decryptObject(encryptedProfile[branch], 0, this);
					} else {
						decrypted[branch] = true;
						this.last.ne();
					}
				}), h.sF(function decryptedBranch(decrypted) {
					decryptedProfile[branch] = decrypted;
					decrypted[branch] = true;

					delete encryptedProfile[branch];
					checkDecryptedProfile();

					this.last.ne();
				}), function (e) {
					decrypting = false;
					theProfile.notify("", "decrypted");

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
							decryptedProfile[attr] = result[attr];
						}
					}

					decrypted = true;
					decrypting = false;
					checkDecryptedProfile();

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
						this._decryptBranch(cb, branch);
					} else {
						this._decryptFully(cb);
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