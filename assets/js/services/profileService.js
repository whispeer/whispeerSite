/**
* ProfileService
**/
define(["step", "whispeerHelper", "crypto/encryptedData", "validation/validator", "asset/observer", "asset/securedDataWithMetaData"], function (step, h, EncryptedData, validator, Observer, SecuredData) {
	"use strict";

	var service = function () {
		//where should the key go? should it be next to the data?
		var profileService = function (data, isDecrypted) {
			var securedData = new SecuredData(data.profile.content, data.profile.meta, {
				removeEmpty: true,
				encryptDepth: 1
			}, isDecrypted);

			var metaData = new EncryptedData(data.own, {}, isDecrypted);

			var id, theProfile = this;

			function checkProfile() {
				var err;
				if (securedData.isDecrypted()) {
					err = validator.validate("profile", securedData.contentGet());	
				} else {
					err = validator.validate("profileEncrypted", securedData.contentGet(), 1);	
				}

				if (err) {
					throw err;
				}
			}

			checkProfile();

			if (!isDecrypted) {
				id = data.profileid;
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
					securedData.signAndEncrypt(signKey, oldCryptKey, this);
				}), h.sF(function (securedProfileData) {
					var result = {
						profileid: id,
						profile: securedProfileData
					};

					this.ne(result);
				}), cb);
			};

			this.signAndEncrypt = function signAndEncryptF(signKey, cryptKey, mainKey, cb) {
				step(function () {
					this.parallel.unflatten();
					securedData.signAndEncrypt(signKey, cryptKey, this.parallel());
					metaData.getUploadData(mainKey, this.parallel());
				}, h.sF(function (securedProfileData, privateProfileData) {
					this.ne({
						profile: securedProfileData,
						own: privateProfileData
					});
				}), cb);
			};

			this.changed = function () {
				return securedData.isChanged() || metaData.isChanged();
			};

			this.verify = function (signKey, cb) {
				securedData.verify(signKey, cb);
			};

			this.setFullProfile = function setFullProfileF(data, cb) {
				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function () {
					securedData.contentSet(data);

					this.ne();
				}), cb);
			};

			this.setAttribute = function setAttributeF(attrs, value, cb) {
				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					securedData.contentAdd(attrs, value);

					this.ne();
				}), cb);
			};

			this.getScope = function (cb) {
				step(function () {
					metaData.getBranch("scope", this);
				}, h.sF(function (scope) {
					this.ne(scope || "always:allfriends");
				}), cb);
			};

			this.getFull = function getFullF(cb) {
				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function () {
					this.last.ne(securedData.contentGet());
				}), cb);
			};

			this.getAttribute = function getAttributeF(attrs, cb) {
				step(function () {
					theProfile.decrypt(this, attrs[0]);
				}, h.sF(function () {
					this.last.ne(h.deepGet(securedData.contentGet(), attrs));
				}), cb);
			};

			this.decrypt = function decryptProfileF(cb, branch) {
				step(function () {
					securedData.decrypt(this, branch);	
				}, h.sF(function () {
					checkProfile();

					this.ne();
				}), cb);
			};

			Observer.call(this);
		};

		return profileService;
	};

	service.$inject = [];

	return service;
});