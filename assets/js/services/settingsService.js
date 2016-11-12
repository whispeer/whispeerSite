define(["step", "whispeerHelper", "crypto/encryptedData", "services/serviceModule", "asset/securedDataWithMetaData", "bluebird"], function (step, h, EncryptedData, serviceModule, SecuredData, Bluebird) {
	"use strict";

	var service = function ($rootScope, $injector, localize, initService, socketService, keyStore) {
		var settings, serverSettings = {}, options = { type: "settings", removeEmpty: true }, api;

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
			donate: {
				refused: false,
				later: 0
			},
			sharePosts: ["always:allfriends"],
			filterSelection: [],
			sound: {
				enabled: true
			},
			messages: {
				sendShortCut: "enter"
			},
			uiLanguage: localize.getLanguage()
		};

		var publicBranches = ["uiLanguage", "sound", "donate"];
		var serverBranches = ["mailsEnabled"];

		function isBranchPublic(branchName) {
			return publicBranches.indexOf(branchName) > -1;
		}

		function isBranchServer(branchName) {
			return serverBranches.indexOf(branchName) > -1;	
		}

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

		function migrateToFormat2(givenOldSettings, blockageToken, cb) {
			console.warn("migrating settings to format 2");

			return Bluebird.try(function() {
				keyStore.security.allowPrivateActions();
				var oldSettings = new EncryptedData(givenOldSettings);
				return oldSettings.decrypt();
			}).then(function(decryptedSettings) {
				var data = turnOldSettingsToNew(decryptedSettings);

				data.meta.initialLanguage = h.getLanguageFromPath();

				var ownUser = $injector.get("ssn.userService").getown();

				return SecuredData.create(data.content, data.meta, options, ownUser.getSignKey(), ownUser.getMainKey());
			}).then(function (signedAndEncryptedSettings) {
				settings = SecuredData.load(signedAndEncryptedSettings.content, signedAndEncryptedSettings.meta, options);

				return socketService.emit("settings.setSettings", {
					settings: signedAndEncryptedSettings,
					blockageToken: blockageToken
				}).thenReturn(settings);
			}).nodeify(cb);
		}

		function loadSettings(givenSettings, blockageToken) {
			serverSettings = givenSettings.server || {};

			return Bluebird.try(function () {
				if (givenSettings.ct) {
					return Bluebird.promisify(migrateToFormat2)(givenSettings, blockageToken);
				} else {
					return SecuredData.load(givenSettings.content, givenSettings.meta, options);
				}
			}).then(function (_settings) {
				settings = _settings;

				var decryptAsync = Bluebird.promisify(api.decrypt.bind(api));

				return decryptAsync();
			}).then(function () {
				var language = api.getBranch("uiLanguage");
				if (language) {
					localize.setLanguage(language);
				}
			});
		}

		var loadCachePromise = Bluebird.resolve();

		function loadFromCache(cacheEntry) {
			var userService = $injector.get("ssn.userService");

			loadCachePromise = Bluebird.race([
				userService.ownLoadedCache(),
				userService.ownLoaded()
			]).then(function () {
				return loadSettings(cacheEntry.data);
			});

			return loadCachePromise;
		}

		function loadFromServer(data, blockageToken) {
			return loadCachePromise.then(function () {
				if (data.unChanged) {
					return Bluebird.resolve();
				}

				var givenSettings = data.content;

				var toCache = h.deepCopyObj(givenSettings);

				var userService = $injector.get("ssn.userService");
				return userService.ownLoaded().then(function () {
					return loadSettings(givenSettings, blockageToken);
				}).thenReturn(toCache);
			});
		}

		initService.get("settings.get", loadFromServer, {
			cacheCallback: loadFromCache,
			cache: true
		});

		$rootScope.$on("reset", function () {
			settings.reset();
		});

		api = {
			getContent: function () {
				return settings.contentGet();
			},
			setContent: function (content) {
				return settings.contentSet(content);
			},
			decrypt: function (cb) {
				step(function () {
					var ownUser = $injector.get("ssn.userService").getown();

					settings.decrypt(this.parallel());
					settings.verify(ownUser.getSignKey(), this.parallel(), "settings");
				}, cb);
			},
			getBranch: function (branchName) {
				var branchContent;

				if (isBranchServer(branchName)) {
					branchContent = serverSettings[branchName];
				} else if (isBranchPublic(branchName)) {
					branchContent = settings.metaAttr(branchName);
				} else {
					branchContent = settings.contentGet()[branchName];
				}

				if (typeof branchContent === "undefined") {
					return defaultSettings[branchName];
				}

				return branchContent;
			},
			updateBranch: function (branchName, value) {
				if (isBranchServer(branchName)) {
					serverSettings[branchName] = value;
				} else if (isBranchPublic(branchName)) {
					settings.metaSetAttr(branchName, value);
				} else {
					settings.contentSetAttr(branchName, value);
				}
			},
			privacy: {
				safetyNames: ["birthday", "location", "relationship", "education", "work", "gender", "languages"],
				setPrivacy: function (privacy, cb, updateProfile) {
					return Bluebird.try(function() {
						api.updateBranch("privacy", privacy);
						return api.uploadChangedData();
					}).then(function() {
						if (!updateProfile) {
							return;
						}

						var userService = $injector.get("ssn.userService");
						return userService.getown().uploadChangedProfile();
					}).nodeify(cb);
				},
				removeCircle: function (id, cb) {
					return Bluebird.try(function() {
						var privacy = api.getBranch("privacy");

						api.privacy.safetyNames.forEach(function (safetyName) {
							h.removeArray(privacy[safetyName].visibility, "circle:" + id);
						});

						h.removeArray(privacy.basic.firstname.visibility, "circle:" + id);
						h.removeArray(privacy.basic.lastname.visibility, "circle:" + id);

						return api.privacy.setPrivacy(privacy, null, true);
					}).nodeify(cb);
				}
			},
			uploadChangedData: function (cb) {
				if (!settings.isChanged()) {
					return Bluebird.resolve(true).nodeify(cb);
				}

				var userService = $injector.get("ssn.userService");

				return settings.getUpdatedData(userService.getown().getSignKey()).then(function (newEncryptedSettings) {
					newEncryptedSettings.server = serverSettings;

					return socketService.emit("settings.setSettings", {
						settings: newEncryptedSettings
					});
				}).then(function(result) {
					return result.success;
				}).nodeify(cb);
			},
			getPrivacyAttribute: function (attr) {
				var b = api.getBranch("privacy");

				var i, attrs = attr.split("."), cur = b;
				for (i = 0; i < attrs.length; i += 1) {
					if (cur[attrs[i]]) {
						if (typeof cur[attrs[i]].encrypt !== "undefined") {
							return cur[attrs[i]];
						}
						cur = cur[attrs[i]];
					}
				}

				throw new Error("could not find attribute settings");
			},
			getPrivacyEncryptionStatus: function (attr) {
				return api.getPrivacyAttribute(attr).encrypt;
			},
			getPrivacyVisibility: function (attr) {
				var privacyAttribute = api.getPrivacyAttribute(attr);

				if (privacyAttribute.encrypt) {
					return privacyAttribute.visibility;
				} else {
					return false;
				}
			}
		};

		return api;
	};

	service.$inject = ["$rootScope", "$injector", "localize", "ssn.initService", "ssn.socketService", "ssn.keyStoreService"];

	serviceModule.factory("ssn.settingsService", service);
});
