define(["step", "whispeerHelper", "crypto/encryptedData"], function (step, h, EncryptedData) {
	"use strict";

	var service = function ($rootScope, $injector, localize, initService) {
		var settings;

		var notVisible = {
			encrypt: true,
			visibility: []
		};

		var defaultSettings = {
			privacy: {
				basic: {
					firstname: {
						encrypt: false,
						visibility: ["always:allfriends"]
					},
					lastname: {
						encrypt: false,
						visibility: ["always:allfriends"]
					}
				},
				imageBlob: {
					encrypt: false,
					visibility: []
				},
				location: notVisible,
				birthday: notVisible,
				relationship: notVisible,
				education: notVisible,
				work: notVisible,
				gender: notVisible,
				languages: notVisible
			},
			sharePosts: ["always:allfriends"],
			sound: {
				enabled: true
			},
			messages: {
				sendShortCut: "enter"
			},
			uiLanguage: localize.getLanguage()
		};

		initService.register("settings.getSettings", {}, function (data, cb) {
			settings = new EncryptedData(data.settings);
			step(function () {
				settings.getBranch("uiLanguage", this);
			}, h.sF(function (language) {
				if (language && language.data) {
					localize.setLanguage(language.data);
				}

				this.ne();
			}), cb);
		});

		$rootScope.$on("reset", function () {
			settings.reset();
		});

		var api = {
			decrypt: function (cb) {
				settings.decrypt(cb);
			},
			getBranch: function (branch, cb) {
				step(function () {
					settings.getBranch(branch, this);
				}, h.sF(function (branchContent) {
					this.ne(branchContent || defaultSettings[branch]);
				}), cb);
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
			privacy: {
				safetyNames: ["birthday", "location", "relationship", "education", "work", "gender", "languages"],
				setPrivacy: function (privacy, cb, updateProfile) {
					step(function () {
						api.updateBranch("privacy", privacy, this);
					}, h.sF(function () {
						api.uploadChangedData(this);
					}), h.sF(function () {
						if (!updateProfile) {
							this.last.ne();
							return;
						}

						var userService = $injector.get("ssn.userService");
						userService.getown().uploadChangedProfile(this);
					}), cb);
				},
				removeCircle: function (id, cb) {
					step(function () {
						api.getBranch("privacy", this);
					}, h.sF(function (privacy) {
						api.privacy.safetyNames.forEach(function (safetyName) {
							h.removeArray(privacy[safetyName].visibility, "circle:" + id);
						});

						h.removeArray(privacy.basic.firstname.visibility, "circle:" + id);
						h.removeArray(privacy.basic.lastname.visibility, "circle:" + id);

						api.privacy.setPrivacy(privacy, this, true);
					}), cb);
				}
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
						if (cur[attrs[i]]) {
							if (typeof cur[attrs[i]].encrypt !== "undefined") {
								this.ne(cur[attrs[i]]);
								return;
							}
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

	service.$inject = ["$rootScope", "$injector", "localize", "ssn.initService"];

	return service;
});