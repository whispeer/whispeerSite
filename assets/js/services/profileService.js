/**
* ProfileService
**/
define(["whispeerHelper", "validation/validator", "services/serviceModule", "asset/observer", "asset/securedDataWithMetaData"], function (h, validator, serviceModule, Observer, SecuredData) {
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

			var id;

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

			if (data.profileid) {
				id = data.profileid;
			}

			this.getID = function getIDF() {
				if (!id) {
					return;
				}

				return isPublicProfile ? "public-" + id : "private-" + id;
			};

			this.getUpdatedData = function getUpdatedData(signKey, cb) {
				//pad updated profile
				//merge paddedProfile and updatedPaddedProfile
				//sign/hash merge
				//encrypt merge

				return this.decrypt().bind(this).then(function () {
					if (isPublicProfile) {
						return this.sign(signKey);
					} else {
						return securedData.getUpdatedData(signKey);
					}
				}).nodeify(cb);
			};

			this.sign = function sign(signKey, cb) {
				if (!isPublicProfile) {
					throw new Error("please encrypt private profiles!");
				}

				return securedData.sign(signKey).then(function (signedMeta) {
					return {
						content: securedData.contentGet(),
						meta: signedMeta
					};
				}).nodeify(cb);
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
				return securedData.verifyAsync(signKey, this.getID()).nodeify(cb);
			};

			this.setFullProfile = function setFullProfileF(data, cb) {
				return this.decrypt().then(function () {
					securedData.contentSet(data);
				}).nodeify(cb);
			};

			this.setAttribute = function setAttributeF(attr, value, cb) {
				return this.decrypt().then(function () {
					securedData.contentSetAttr(attr, value);
				}).nodeify(cb);
			};

			this.getFull = function getFullF(cb) {
				return this.decrypt().then(function () {
					return securedData.contentGet();
				}).nodeify(cb);
			};

			this.getAttribute = function getAttributeF(attrs, cb) {
				return this.decrypt().then(function () {
					return h.deepGet(securedData.contentGet(), attrs);
				}).nodeify(cb);
			};

			this.decrypt = function (cb) {
				return securedData.decrypt().then(function () {
					checkProfile();
				}).nodeify(cb);
			};

			Observer.call(this);
		};

		return profileService;
	};

	service.$inject = [];

	serviceModule.factory("ssn.profileService", service);
});
