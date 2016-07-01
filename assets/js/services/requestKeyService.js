define(["services/serviceModule", "whispeerHelper", "bluebird", "debug", "crypto/keyStore"], function (serviceModule, h, Bluebird, debug, keyStore) {
	"use strict";

	var service = function (errorService, socket, CacheService) {
		//maximum cache time: one week!
		var MAXCACHETIME  = 7 * 24 * 60 * 60 * 1000;

		var keyCache = new CacheService("keys");
		var keyStoreDebug = debug("whispeer:keyStore");
		var blockageToken = "";

		function cleanCache() {
			return keyCache.all().each(function (cacheEntry) {
				var data = JSON.parse(cacheEntry.data);
				if (data.removeAfter < new Date().getTime()) {
					keyStoreDebug("remove by time: " + data.removeAfter);
					keyCache.delete(cacheEntry.id.split("/")[1]);
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
					keyStoreDebug("remove by object id: " + objectID);
					keyCache.delete(keyID);
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
					blockageToken: blockageToken,
					loaded: [],
					realids: identifiers
				}).thenReturn(identifiers);
			}).nodeify(cb);
		}

		var THROTTLE = 20;
		var delay = h.delayMultiple(THROTTLE, loadKeys);
		var delayAsync = Bluebird.promisify(delay);

		/** load a key and his keychain. remove loaded keys */
		return {
			MAXCACHETIME: MAXCACHETIME,
			setBlockageToken: function (_blockageToken) {
				blockageToken = _blockageToken;
			},
			getKey: function (keyID, callback) {
				if (typeof keyID !== "string") {
					throw new Error("not a valid key realid: " + keyID);
				}

				if (keyStore.upload.isKeyLoaded(keyID)) {
					callback();
				}

				keyStoreDebug("loading key: " + keyID);

				return keyCache.get(keyID).then(function (cacheEntry) {
					if (cacheEntry.data.removeAfter < new Date().getTime()) {
						keyStoreDebug("Remove Key from Cache " + keyID);
						keyCache.delete(keyID);
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
