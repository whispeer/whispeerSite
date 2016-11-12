define(["bluebird", "whispeerHelper"], function (Bluebird, h) {
	"use strict";
	return function ($injector, cb) {
		var friendsService = $injector.get("ssn.friendsService");
		var keyStore = $injector.get("ssn.keyStoreService");
		var friendsKeys;

		var userid, invalidKey;

		return friendsService.awaitLoading().then(function () {
			friendsKeys = friendsService.getAllFriendShipKeys();
			return keyStore.upload.preLoadMultiple(friendsKeys);
		}).then(function () {
			var invalidKeys = friendsKeys.filter(function (realid) {
				return !keyStore.upload.isKeyLoaded(realid);
			});

			if (invalidKeys.length === 0) {
				return Bluebird.resolve(true)
			} else {
				return Bluebird.resolve(invalidKeys)
				.then(function (invalidKeys) {
					invalidKey = invalidKeys[0];
					userid = friendsService.getUserForKey(invalidKey);
					return friendsService.removeFriend(userid);
				}).then(function () {
					return friendsService.friendship(userid);
				}).then(function () {
					console.log("fixed invalid key: " + invalidKey);
				});
			}
		}).nodeify(cb);
	};
});