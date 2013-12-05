/**
* ProfileService
**/
define(["crypto/keyStore", "step", "whispeerHelper", "valid/validator", "asset/Observer"], function (keyStore, step, h, validator, Observer) {
	"use strict";

	var service = function () {
		//where should the key go? should it be next to the data?
		var profileService = function (data, isDecrypted) {
			var encryptedProfile, paddedProfile = {}, decryptedProfile = {}, updatedProfile = {}, decrypted = {}, hashObject;

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

			function padDecryptedProfile(cb) {
				step(function () {
					keyStore.hash.addPaddingToObject(decryptedProfile, 128, this);
				}, h.sF(function (paddedProfileObject) {
					paddedProfile = paddedProfileObject;
					this.ne();
				}), cb);
			}

			function unpadPaddedProfile(cb) {
				step(function () {
					keyStore.hash.removePaddingFromObject(paddedProfile, 128, this);
				}, h.sF(function (unpaddedProfileObject) {
					decryptedProfile = unpaddedProfileObject;
					this.ne();
				}), cb);
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
				hashObject = data.hashObject;

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
					keyStore.sign.verifyHash(signature, keyStore.format.unformat(hashObject.hash, "hash"), key, this);
				}), h.sF(function (valid) {
					if (valid) {
						verified = true;
					} else {
						h.setAll(decryptedProfile, "Security Breach!");
					}
				}), cb);
			};

			function signProfile(key, cb) {
				step(function () {
					keyStore.sign.signObject(paddedProfile, key, this);
				}, h.sF(function (result) {
					signature = result;
					this.ne(result);
				}), cb);
			}

			function generateHashObject() {
				hashObject = keyStore.hash.deepHashObject(paddedProfile);
				return hashObject;
			}

			function encryptProfile(key, cb) {
				step(function () {
					keyStore.sym.encryptObject(paddedProfile, key, 1, this);
				}, h.sF(function (result) {
					encryptedProfile = result;

					this.ne(result);
				}), cb);
			}

			this.signAndEncrypt = function signAndEncryptF(signKey, cryptKey, cb) {
				step(function () {
					padDecryptedProfile(this);
				}, h.sF(function () {
					this.parallel.unflatten();

					encryptProfile(cryptKey, this.parallel());
					signProfile(signKey, this.parallel());
				}), h.sF(function (encryptedProfile, signature) {
					var result = {
						profile: encryptedProfile,
						signature: signature,
						hashObject: generateHashObject(),
						key: cryptKey
					};

					this.ne(result);
				}), cb);
			};

			this.setAttribute = function setAttributeF(attrs, value, cb) {
				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					h.deepSet(updatedProfile, attrs, value);
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

			function decryptBranch(cb, branch) {
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
				}), h.sF(function decryptedBranch(decryptedData) {
					paddedProfile[branch] = decryptedData;
					decrypted[branch] = true;

					if (keyStore.hash.hashObjectHex(paddedProfile[branch]) !== hashObject[branch]) {
						throw "security breach!";
					}

					unpadPaddedProfile(this);
				}), h.sF(function () {
					delete encryptedProfile[branch];
					checkDecryptedProfile();
					this.last.ne();
				}), function (e) {
					decrypting = false;
					theProfile.notify("", "decrypted");

					cb(e);
				});
			}

			function decryptFull(cb) {
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
					unpadPaddedProfile(this);
				}), h.sF(function () {
					theProfile.notify("", "decrypted");

					this.ne();
				}), cb);
			}

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
						decryptBranch(cb, branch);
					} else {
						decryptFull(cb);
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