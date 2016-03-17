define(["step", "whispeerHelper", "crypto/trustManager", "crypto/signatureCache", "services/serviceModule", "bluebird"], function (step, h, trustManager, signatureCache, serviceModule, Bluebird) {
	"use strict";

	var service = function ($rootScope, initService, userService, socketService, CacheService, sessionService, errorService) {
		var THROTTLE = 20, signatureCacheObject = new CacheService("signatureCache");

		function uploadDatabase(cb) {
			step(function () {
				trustManager.getUpdatedVersion(this);
			}, h.sF(function (newTrustContent) {
				new CacheService("trustManager.get").store(sessionService.getUserID(), newTrustContent);

				socketService.emit("trustManager.set", {
					content: newTrustContent
				}, this);
			}), h.sF(function (result) {
				if (result.success) {
					this.ne();
				} else {
					errorService.criticalError(result.error);
				}
			}), cb);
		}

		var delay = h.aggregateOnce(THROTTLE, uploadDatabase);


		function storeSignatureCache() {
			if (signatureCache.isChanged()) {
				console.log("Storing signature cache!");

				signatureCache.resetChanged();

				signatureCache.getUpdatedVersion().then(function (updatedVersion) {
					console.log(updatedVersion);
					return signatureCacheObject.store(sessionService.getUserID(), updatedVersion);
				}).then(function () {
					console.log("stored signature cache");
				});
			}
		}

		window.setInterval(storeSignatureCache, 10000);

		function addNewUsers(user) {
			if (trustManager.isLoaded() && !trustManager.hasKeyData(user.getSignKey())) {
				trustManager.addUser(user);
				delay();
			}
		}

		userService.listen(addNewUsers, "loadedUser");
		userService.verifyOwnKeysDone().then(function () {
			trustManager.setOwnSignKey(userService.getown().getSignKey());
		});

		function loadDatabase(database, cb) {
			step(function () {
				trustManager.loadDatabase(database, this);
			}, h.sF(function () {
				this.ne(database);
			}), cb);
		}

		function createTrustDatabase(cb) {
			step(function () {
				trustManager.createDatabase(userService.getown());
				this.ne();

				uploadDatabase(errorService.criticalError);	
			}, cb);
		}

		function loadCacheAndAddServer(cache, server, cb) {
			step(function () {
				trustManager.loadDatabase(cache, this);
			}, h.sF(function () {
				trustManager.updateDatabase(server, this);
			}), h.sF(function (changedByUpdate) {
				if (changedByUpdate) {
					uploadDatabase(errorService.criticalError);
					this.ne(cache);
				} else {
					this.ne(server);
				}
			}), cb);
		}

		initService.get("trustManager.get", undefined, function (data, cache, cb) {
			userService.verifyOwnKeysDone().then(function () {
				if (cache && data.content) {
					loadCacheAndAddServer(cache.data, data.content, cb);
				} else if (cache) {
					loadDatabase(cache.data, cb);
				} else if (data.content) {
					loadDatabase(data.content, cb);
				} else {
					createTrustDatabase(cb);
				}
			});
		}, {
			cache: true
		});

		$rootScope.$on("ssn.reset", function () {
			trustManager.reset();
			signatureCache.reset();
		});

		socketService.channel("notify.trustManager", function (e, data) {
			trustManager.updateDatabase(data, function (e) {
				if (e) {
					throw e;
				}
			});
		});

		sessionService.listenPromise("ssn.login").then(function () {
			console.time("getSignatureCache");
			return signatureCacheObject.get(sessionService.getUserID()).catch(function () {
				return;
			});
		}).then(function (signatureCacheData) {
			console.timeEnd("getSignatureCache");
			return userService.verifyOwnKeysDone().then(function () {
				return signatureCacheData;
			});
		}).then(function (signatureCacheData) {
			if (signatureCacheData) {
				signatureCache.load(signatureCacheData.data, userService.getown().getSignKey());
			} else {
				signatureCache.initialize(userService.getown().getSignKey());
			}
		});

		return {
			hasKey: function (keyid) {
				return trustManager.hasKeyData(keyid);
			},
			getKey: function (keyid) {
				return trustManager.getKeyData(keyid);
			},
			verifyUser: function (user, cb) {
				var keyData = trustManager.getKeyData(user.getSignKey());
				keyData.setTrust(trustManager.trustStates.VERIFIED);
				uploadDatabase(cb);
			},
			addUser: function (user) {
				return trustManager.addUser(user);
			}
		};
	};

	service.$inject = ["$rootScope", "ssn.initService", "ssn.userService", "ssn.socketService", "ssn.cacheService", "ssn.sessionService", "ssn.errorService"];

	serviceModule.factory("ssn.trustService", service);
});
