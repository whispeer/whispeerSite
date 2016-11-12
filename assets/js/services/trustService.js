define(["whispeerHelper", "crypto/trustManager", "crypto/signatureCache", "services/serviceModule", "debug", "bluebird"], function (h, trustManager, signatureCache, serviceModule, debug, Bluebird) {
	"use strict";

	var debugName = "whispeer:trustService";
	var trustServiceDebug = debug(debugName);

	function time(name) {
		if (debug.enabled(debugName)) {
			console.time(name);
		}
	}

	function timeEnd(name) {
		if (debug.enabled(debugName)) {
			console.timeEnd(name);
		}
	}

	var service = function ($rootScope, initService, userService, socketService, CacheService, sessionService, errorService) {
		var THROTTLE = 20, STORESIGNATURECACHEINTERVAL = 30000, signatureCacheObject = new CacheService("signatureCache");

		function uploadDatabase(cb) {
			return initService.awaitLoading().then(function () {
				return trustManager.getUpdatedVersion();
			}).then(function (newTrustContent) {
				new CacheService("trustManager.get").store(sessionService.getUserID(), newTrustContent);

				return socketService.emit("trustManager.set", {
					content: newTrustContent
				});
			}).then(function (response) {
				if (!response.success) {
					errorService.criticalError(response.error);
				}
			}).nodeify(cb);
		}

		var delay = h.aggregateOnce(THROTTLE, uploadDatabase);


		function storeSignatureCache() {
			if (signatureCache.isChanged()) {
				trustServiceDebug("Storing signature cache!");
				time("storedSignatureCache");

				signatureCache.resetChanged();

				signatureCache.getUpdatedVersion().then(function (updatedVersion) {
					return signatureCacheObject.store(sessionService.getUserID(), updatedVersion);
				}).then(function () {
					timeEnd("storedSignatureCache");
				});
			}
		}

		window.setInterval(storeSignatureCache, STORESIGNATURECACHEINTERVAL);

		function addNewUsers(user) {
			if (trustManager.isLoaded() && !trustManager.hasKeyData(user.getSignKey())) {
				trustManager.addUser(user);
				delay();
			}
		}

		userService.listen(addNewUsers, "loadedUser");

		function loadDatabase(database, cb) {
			return trustManager.loadDatabase(database).thenReturn(database).nodeify(cb);
		}

		function createTrustDatabase(cb) {
			Bluebird.try(function () {
				trustManager.createDatabase(userService.getown());

				return uploadDatabase();
			}).nodeify(cb);
		}

		var loadDatabaseAsync = Bluebird.promisify(loadDatabase);
		var createTrustDatabaseAsync = Bluebird.promisify(createTrustDatabase);

		var loadCachePromise = Bluebird.resolve();

		function loadFromCache(cacheEntry) {
			trustServiceDebug("trustManager cache get done");
			loadCachePromise = Bluebird.race([
				userService.verifyOwnKeysDone(),
				userService.verifyOwnKeysCacheDone()
			]).then(function () {
				trustServiceDebug("trustManager cache loading");
				return loadDatabaseAsync(cacheEntry.data);
			});

			return loadCachePromise;
		}

		initService.get("trustManager.get", function (data) {
			trustServiceDebug("trustManager.get finished unchanged: " + data.unChanged);
			return loadCachePromise.catch(function (e) {
				trustServiceDebug("Could not load trust service from cache!");
				console.error(e);
			}).then(function () {
				return userService.verifyOwnKeysDone();
			}).then(function () {
				if (data.unChanged) {
					if (!trustManager.isLoaded()) {
						throw new Error("cache loading seems to have failed but server is unchanged!");
					}

					trustServiceDebug("trustManager unChanged");
					return;
				}

				trustServiceDebug("trustManager get loading");

				if (trustManager.isLoaded()) {
					trustServiceDebug("trustManager cache exists updating");

					var updateDatabaseAsync = Bluebird.promisify(trustManager.updateDatabase.bind(trustManager));

					return updateDatabaseAsync(data.content).then(function () {
						return false;
					});
				}

				if (data.content) {
					trustServiceDebug("load content");
					return loadDatabaseAsync(data.content);
				}

				trustServiceDebug("create new trust database!");
				return createTrustDatabaseAsync();
			});
		}, {
			cacheCallback: loadFromCache,
			cache: true
		});

		$rootScope.$on("ssn.reset", function () {
			trustManager.reset();
		});

		socketService.channel("notify.trustManager", function (e, data) {
			trustManager.updateDatabase(data, function (e) {
				if (e) {
					throw e;
				}
			});
		});

		sessionService.listenPromise("ssn.login").then(function () {
			time("getSignatureCache");
			return signatureCacheObject.get(sessionService.getUserID()).catch(function () {
				return;
			});
		}).then(function (signatureCacheData) {
			timeEnd("getSignatureCache");
			return Bluebird.race([
				userService.verifyOwnKeysCacheDone(),
				userService.verifyOwnKeysDone()
			]).then(function () {
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
				return Bluebird.try(function () {
					var keyData = trustManager.getKeyData(user.getSignKey());
					keyData.setTrust(trustManager.trustStates.VERIFIED);
					return uploadDatabase();
				}).nodeify(cb);
			},
			addUser: function (user) {
				return trustManager.addUser(user);
			}
		};
	};

	service.$inject = ["$rootScope", "ssn.initService", "ssn.userService", "ssn.socketService", "ssn.cacheService", "ssn.sessionService", "ssn.errorService"];

	serviceModule.factory("ssn.trustService", service);
});
