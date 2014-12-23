/**
* ProfileService
**/
define(["step", "whispeerHelper", "validation/validator", "asset/observer", "asset/securedDataWithMetaData"], function (step, h, validator, Observer, SecuredData) {
	"use strict";

	var service = function () {
		var profileService = function (data, options) {
			options = options || {};

			var isPublicProfile = options.isPublicProfile === true;
			var isDecrypted = options.isDecrypted || isPublicProfile;

			var securedData;

			if (isDecrypted) {
				securedData = SecuredData.createRaw(data.content, data.meta, {
					type: "profile",
					removeEmpty: true,
					encryptDepth: 1
				});
			} else {
				securedData = SecuredData.load(data.content, data.meta, {
					type: "profile",
					removeEmpty: true,
					encryptDepth: 1
				});
			}

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
				var that = this;
				//pad updated profile
				//merge paddedProfile and updatedPaddedProfile
				//sign/hash merge
				//encrypt merge
				step(function () {
					theProfile.decrypt(this);
				}, h.sF(function  () {
					if (isPublicProfile) {
						that.sign(signKey, this);
					} else {
						securedData.getUpdatedData(signKey, this);
					}
				}), cb);
			};

			this.sign = function sign(signKey, cb) {
				if (!isPublicProfile) {
					throw new Error("please encrypt private profiles!");
				}

				step(function () {
					securedData.sign(signKey, this);
				}, h.sF(function (signedMeta) {
					var result = {
						content: securedData.contentGet(),
						meta: signedMeta
					};

					this.ne(result);
				}), cb);
			};

			this.signAndEncrypt = function signAndEncryptF(signKey, cryptKey, cb) {
				if (isPublicProfile) {
					throw new Error("no encrypt for public profiles!");
				}

				securedData._signAndEncrypt(signKey, cryptKey, cb);
			};

			this.updated = function () {
				return securedData.updated();
			};

			this.changed = function () {
				return securedData.isChanged();
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

			this.setAttribute = function setAttributeF(attr, value, cb) {
				step(function () {
					theProfile.decrypt(this, attr);
				}, h.sF(function () {
					securedData.contentSetAttr(attr, value);

					this.ne();
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