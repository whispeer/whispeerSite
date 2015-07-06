define(["step", "whispeerHelper", "crypto/encryptedData", "services/serviceModule", "asset/securedDataWithMetaData"], function (step, h, EncryptedData, serviceModule, SecuredData) {
	"use strict";

	var service = function ($rootScope, $injector, localize, initService, socketService) {
		var settings, options = { type: "settings", removeEmpty: true };

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

		function turnOldSettingsToNew(settings) {
			var result = {
				meta: {},
				content: {}
			};

			h.objectEach(settings, function (key, val) {
				if (isBranchPublic(key)) {
					result.meta[key] = val;
				} else {
					result.content[key] = val;
				}
			});

			return result;
		}

		function migrateToFormat2(data, cb) {
			step(function () {
				var oldSettings = new EncryptedData(data.settings);
				oldSettings.decrypt(this);
			}, h.sF(function (decryptedSettings) {
				var data = turnOldSettingsToNew(decryptedSettings);

				var ownUser = $injector.get("ssn.userService").getown();

				SecuredData.create(data.content, data.meta, options, ownUser.getSignKey(), ownUser.getMainKey(), this);
			}), h.sF(function (signedAndEncryptedSettings) {
				settings = SecuredData.load(signedAndEncryptedSettings.content, signedAndEncryptedSettings.meta, options);

				socketService.emit("settings.setSettings", {
					settings: signedAndEncryptedSettings
				}, this);
			}), h.sF(function () {
				this.ne(settings);
			}), cb);
		}

		initService.register("settings.getSettings", {}, function (data, cb) {
			step(function () {
				if (data.settings.ct) {
					migrateToFormat2(data, this);
				} else {
					this.ne(SecuredData.load(data.settings.content, data.settings.meta, options));
				}
			}, h.sF(function (_settings) {
				settings = _settings;
				api.getBranch("uiLanguage", this);
			}), h.sF(function (language) {
				if (language) {
					localize.setLanguage(language);
				}

				this.ne();
			}), cb);
		});

		$rootScope.$on("reset", function () {
			settings.reset();
		});

		var publicBranches = ["uiLanguage", "sound"];

		function isBranchPublic(branchName) {
			return publicBranches.indexOf(branchName) > -1;
		}

		var api = {
			decrypt: function (cb) {
				step(function () {
					var ownUser = $injector.get("ssn.userService").getown();

					settings.decrypt(this.parallel());
					settings.verify(ownUser.getSignKey(), this.parallel());
				}, cb);
			},
			getBranch: function (branchName, cb) {
				step(function () {
					api.decrypt(this);
				}, h.sF(function () {
					var branchContent;

					if (isBranchPublic(branchName)) {
						branchContent = settings.metaAttr(branchName);
					} else {
						branchContent = settings.contentGet()[branchName];
					}

					this.ne(branchContent || defaultSettings[branchName]);
				}), cb);
			},
			updateBranch: function (branchName, value) {
				if (isBranchPublic(branchName)) {
					settings.metaSetAttr(branchName, value);
				} else {
					settings.contentSetAttr(branchName, value);
				}
			},
			privacy: {
				safetyNames: ["birthday", "location", "relationship", "education", "work", "gender", "languages"],
				setPrivacy: function (privacy, cb, updateProfile) {
					step(function () {
						api.updateBranch("privacy", privacy, this);
						api.uploadChangedData(this);
					}, h.sF(function () {
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

					if (settings.isChanged()) {
						settings.getUpdatedData(userService.getown().getSignKey(), this);
					} else {
						this.last.ne(true);
					}
				}, h.sF(function (newEncryptedSettings) {
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

	service.$inject = ["$rootScope", "$injector", "localize", "ssn.initService", "ssn.socketService"];

	serviceModule.factory("ssn.settingsService", service);
});
