define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($rootScope, initService, keyStoreService) {
		var encryptedSettings, decryptedSettings, decrypted = false;

		initService.register("settings.getSettings", {}, function (data) {
			encryptedSettings = data.settings;
		});

		$rootScope.$on("reset", function () {
			encryptedSettings = {};
			decryptedSettings = {};
			decrypted = false;
		});

		var api = {
			decrypt: function (cb) {
				step(function () {
					if (decrypted) {
						this.last.ne();
					} else {
						keyStoreService.sym.decryptObject(encryptedSettings, 0, this);
					}
				}, h.sF(function (decryptedObj) {
					if (decryptedObj) {
						decryptedSettings = decryptedObj;
						decrypted = true;
					} else {
						throw "could not decrypt settings";
					}

					this.ne();
				}), cb);
			},
			getBranch: function (branch, cb) {
				step(function () {
					api.decrypt(this);
				}, h.sF(function () {
					this.ne(decryptedSettings[branch]);
				}), cb);
			},
			getPrivacyAttribute: function (attr, cb) {
				step(function () {
					api.getBranch("privacy", this);
				}, h.sF(function (b) {
					var i, attrs = attr.split("."), cur = b;
					for (i = 0; i < attrs.length; i += 1) {
						if (cur[attrs[i]].encrypt) {
							this.ne(cur[attrs[i]]);
							return;
						} else if (cur[attrs[i]]) {
							cur = cur[attrs[i]];
						}
					}

					throw "could not find attribute settings";
					//this.ne(h.deepGet(b, attr.split(".")));
				}), cb);
			},
			getPrivacyEncryptionStatus: function (attr, cb) {
				step(function () {
					api.getPrivacyAttribute(attr, this);
				}, h.sF(function (b) {
					this.ne(b.encrypt);
				}), cb);
			},
			getPrivacyVisibility: function (attr, cb) {
				step(function () {
					api.getPrivacyAttribute(attr, this);
				}, h.sF(function (b) {
					if (b.encrypt) {
						this.ne(b.visibility);
					} else {
						this.ne(false);
					}
				}), cb);
			}
		};

		window.dada = api;

		return api;
	};

	service.$inject = ["$rootScope", "ssn.initService", "ssn.keyStoreService"];

	return service;
});