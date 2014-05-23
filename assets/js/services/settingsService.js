define(["step", "whispeerHelper", "asset/encryptedMetaData"], function (step, h, EncryptedMetaData) {
	"use strict";

	var service = function ($rootScope, $injector, initService) {
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
			updateAttribute: function (attrs, value, cb) {
				settings.setAttribute(attrs, value, cb);
			},
			updatePrivacyAttribute: function (attrs, value, cb) {
				api.updateAttribute(attrs.unshift("privacy"), value, cb);
			},
			updateBranch: function (branchName, value, cb) {
				settings.setAttribute([branchName], value, cb);
			},
			uploadChangedData: function (cb) {
				step(function () {
					var userService = $injector.get("ssn.userService");
					if (settings.isChanged) {
						settings.getUploadData(userService.getown().getMainKey(), this);
					} else {
						this.last.ne(true);
					}
				}, h.sF(function (newEncryptedSettings) {
					var socketService = $injector.get("ssn.socketService");
					socketService.emit("settings.setSettings", {
						settings: newEncryptedSettings
					}, this);
				}), h.sF(function (result) {
					this.ne(result.success);
				}), cb);
			},
			getPrivacyAttribute: function (attr, cb) {
				step(function () {
					api.getBranch("privacy", this);
				}, h.sF(function (b) {
					var i, attrs = attr.split("."), cur = b;
					for (i = 0; i < attrs.length; i += 1) {
						if (typeof cur[attrs[i]].encrypt !== "undefined") {
							this.ne(cur[attrs[i]]);
							return;
						} else if (cur[attrs[i]]) {
							cur = cur[attrs[i]];
						}
					}

					throw new Error("could not find attribute settings");
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

	service.$inject = ["$rootScope", "$injector", "ssn.initService"];

	return service;
});