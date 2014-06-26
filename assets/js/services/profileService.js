/**
* ProfileService
**/
define(["crypto/keyStore", "step", "whispeerHelper", "crypto/encryptedData", "validation/validator", "asset/observer"], function (keyStore, step, h, EncryptedData, validator, Observer) {
	"use strict";

	var service = function () {
		//where should the key go? should it be next to the data?
		var profileService = function (data, isDecrypted) {
			var encryptedProfile, paddedProfile = {}, decryptedProfile = {}, updatedProfile = {}, decrypted = {}, hashObject;

			var metaData = new EncryptedData(data.metaData, {}, isDecrypted);

			var decrypting = false, verified = false, key;

			var id, signature, changed = false;
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
				var err = validator.validate("profileEncrypted", encryptedProfile, 1);
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

			function unpadPaddedProfile() {
				decryptedProfile = keyStore.hash.removePaddingFromObject(paddedProfile, 128);
			}

			if (isDecrypted) {
				decrypted = true;
				decryptedProfile = data.profile;

				checkDecryptedProfile();
			} else {
				id = data.profileid;
				signature = data.signature;

				if (typeof data.profile.key === "object") {
					data.profile.key = keyStore.upload.addKey(data.profile.key);
					key = data.profile.key;
				}
				encryptedProfile = data.profile;
				hashObject = data.hashObject;

				checkEncryptedProfile();
			}

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

			this.getID = function getIDF() {
				return id;
			};

			this.getUpdatedData = function getUpdatedData(signKey, cb) {
				//pad updated profile
				//merge paddedProfile and updatedPaddedProfile
				//sign/hash merge
				//encrypt merge
				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function  () {
					updatedProfile = h.extend(decryptedProfile, updatedProfile, 5, true);

					keyStore.hash.addPaddingToObject(updatedProfile, 128, this);
				}), h.sF(function (paddedUpdatedProfile) {
					paddedProfile = paddedUpdatedProfile;
					decryptedProfile = updatedProfile;

					this.parallel.unflatten();

					encryptProfile(key, this.parallel());
					signProfile(signKey, this.parallel());
				}), h.sF(function (encryptedProfile, signature) {
					var result = {
						profileid: id,
						profile: encryptedProfile,
						signature: signature,
						hashObject: generateHashObject(),
					};

					this.ne(result);
				}), cb);
			};

			this.signAndEncrypt = function signAndEncryptF(signKey, cryptKey, mainKey, cb) {
				step(function () {
					padDecryptedProfile(this);
				}, h.sF(function () {
					this.parallel.unflatten();

					encryptProfile(cryptKey, this.parallel());
					signProfile(signKey, this.parallel());
					metaData.getUploadData(mainKey, this.parallel());
				}), h.sF(function (encryptedProfile, signature, metaData) {
					var result = {
						profile: encryptedProfile,
						signature: signature,
						hashObject: generateHashObject(),
						metaData: metaData
					};

					this.ne(result);
				}), cb);
			};

			this.changed = function () {
				return changed;
			};

			this.setFullProfile = function setFullProfileF(data, cb) {
				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function () {
					h.objectEach(decryptedProfile, function (key) {
						if (!data.hasOwnProperty(key)) {
							changed = true;

							delete encryptedProfile[key];
							delete paddedProfile[key];
						}
					});

					h.objectEach(data, function (key, value) {
						if (!h.deepEqual(value, decryptedProfile[key])) {
							changed = true;

							updatedProfile[key] = value;
						}
					});

					this.ne(changed);
				}), cb);
			};

			this.setAttribute = function setAttributeF(attrs, value, cb) {
				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					if (h.deepGet(decryptedProfile, attrs) !== value) {
						changed = h.deepSetCreate(updatedProfile, attrs, value) || changed;
					}

					this.ne();
				}), cb);
			};

			this.getScope = function (cb) {
				step(function () {
					//TODO: move scope to meta!
					metaData.getBranch("scope", this);
				}, h.sF(function (scope) {
					this.ne(scope);
				}), cb);
			};

			this.updated = function updatedF() {
				unpadPaddedProfile();
				changed = false;
			};

			this.getFull = function getFullF(cb) {
				if (decrypted === true) {
					cb(null, decryptedProfile);
					return;
				}

				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function () {
					this.last.ne(decryptedProfile);
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
					if (keyStore.hash.hashObjectOrValueHex(decryptedData) !== hashObject[branch]) {
						throw new Error("security breach!");
					}

					paddedProfile[branch] = decryptedData;
					decrypted[branch] = true;

					unpadPaddedProfile();

					delete encryptedProfile[branch];
					if (Object.keys(encryptedProfile).length === 1) {
						decrypted = true;
					}
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
					keyStore.sym.decryptObject(encryptedProfile, 1, this);
				}, h.sF(function (result) {
					var attr;
					for (attr in result) {
						if (result.hasOwnProperty(attr)) {
							paddedProfile[attr] = result[attr];
						}
					}

					decrypted = true;
					decrypting = false;
					checkDecryptedProfile();
					unpadPaddedProfile();

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