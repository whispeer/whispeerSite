define(["step", "whispeerHelper", "crypto/trustManager", "crypto/signatureCache", "services/serviceModule", "debug", "bluebird"], function (step, h, trustManager, signatureCache, serviceModule, debug, Bluebird) {
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
			step(function () {
				initService.awaitLoading(this);
			}, h.sF(function () {
				trustManager.getUpdatedVersion(this);
			}), h.sF(function (newTrustContent) {
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

		var loadDatabaseAsync = Bluebird.promisify(loadDatabase);
		var createTrustDatabaseAsync = Bluebird.promisify(createTrustDatabase);

		function loadFromCache(cacheEntry) {
			trustServiceDebug("trustManager cache get done");
			return userService.verifyOwnKeysCacheDone().then(function () {
				trustServiceDebug("trustManager cache loading");
				return loadDatabaseAsync(cacheEntry.data);
			});
		}

		initService.get("trustManager.get", function (data) {
			trustServiceDebug("trustManager.get finished unchanged: " + data.unChanged);
			return userService.verifyOwnKeysDone().then(function () {
				if (data.unChanged) {
					trustServiceDebug("trustManager unChanged");
					return;
				}

				trustServiceDebug("trustManager get loading");

				if (trustManager.isLoaded()) {
					trustServiceDebug("trustManager cache exists updating");

					var updateDatabaseAsync = Bluebird.promisify(trustManager.updateDatabase, trustManager);

					return updateDatabaseAsync(data.content);
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
