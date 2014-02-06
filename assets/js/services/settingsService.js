define(["step", "whispeerHelper", "asset/encryptedMetaData"], function (step, h, EncryptedMetaData) {
	"use strict";

	var service = function ($rootScope, initService) {
		var settings;

		initService.register("settings.getSettings", {}, function (data) {
			settings = new EncryptedMetaData(data.settings);
		});

		$rootScope.$on("reset", function () {
			settings.reset();
		});

		var api = {
			decrypt: function (cb) {
				settings.decrypt(cb);
			},
			getBranch: function (branch, cb) {
				settings.getBranch(branch, cb);
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

		return api;
	};

	service.$inject = ["$rootScope", "ssn.initService"];

	return service;
});