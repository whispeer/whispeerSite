define(["services/serviceModule", "whispeerHelper", "bluebird", "debug", "crypto/keyStore"], function (serviceModule, h, Bluebird, debug, keyStore) {
	"use strict";

	var service = function (errorService, socket, CacheService) {
		//maximum cache time: one week!
		var MAXCACHETIME  = 7 * 24 * 60 * 60 * 1000;

		var keyCache = new CacheService("keys");
		var keyStoreDebug = debug("whispeer:keyStore");

		function cleanCache() {
			return keyCache.all().each(function (cacheEntry) {
				var data = JSON.parse(cacheEntry.data);
				if (data.removeAfter < new Date().getTime()) {
					//TODO: remove!
				}
			});
		}

		window.setTimeout(cleanCache, 30 * 1000);
		window.setInterval(cleanCache, 10 * 60 * 1000);

		function removeByObjectId(keyID, objectID) {
			//remove keys with same objectID
			return keyCache.all().each(function (cacheEntry) {
				var data = JSON.parse(cacheEntry.data);

				if (objectID === data.objectID && keyID !== data.key.realid) {
					//TODO: remove!
					keyStoreDebug("remove by object id: " + objectID);
				}
			});
		}

		function loadKeys(identifiers, cb) {
			return Bluebird.try(function () {
				var toLoadIdentifiers = identifiers.filter(function (e) {
					return !keyStore.upload.isKeyLoaded(e);
				});

				if (toLoadIdentifiers.length === 0) {
					return identifiers;
				}

				return socket.definitlyEmit("key.getMultiple", {
					loaded: [],
					realids: identifiers
				}, this).thenReturn(identifiers);
			}).nodeify(cb);
		}

		var THROTTLE = 20;
		var delay = h.delayMultiple(THROTTLE, loadKeys);
		var delayAsync = Bluebird.promisify(delay);

		/** load a key and his keychain. remove loaded keys */
		return {
			MAXCACHETIME: MAXCACHETIME,
			getKey: function (keyID, callback) {
				if (typeof keyID !== "string") {
					throw new Error("not a valid key realid: " + keyID);
				}

				if (keyStore.upload.isKeyLoaded(keyID)) {
					callback();
				}

				keyStoreDebug("loading key: " + keyID);

				keyCache.get(keyID).then(function (cacheEntry) {
					if (cacheEntry.data.removeAfter < new Date().getTime()) {
						keyStoreDebug("Remove Key from Cache " + keyID);
						//TODO: remove!
					}

					keyStore.upload.addKey(cacheEntry.data.key);
				}).catch(function () {
					return delayAsync(keyID);
				}).nodeify(callback);
			},
			cacheKey: function (realID, objectID, time) {
				time = Math.min(time, MAXCACHETIME);

				return removeByObjectId(realID, objectID).then(function () {
					var keyData = keyStore.upload.getExistingKey(realID);
					
					if (!keyData) {
						keyStoreDebug("Could not cache key yet " + realID);
						return;
					}

					return keyCache.store(realID, {
						key: keyData,
						objectID: objectID,
						removeAfter: new Date().getTime() + time
					});
				});
			}
		};
	};

	service.$inject = ["ssn.errorService", "ssn.socketService", "ssn.cacheService"];

	serviceModule.factory("ssn.requestKeyService", service);
});
