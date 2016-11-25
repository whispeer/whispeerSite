define(["bluebird"], function (Bluebird) {
	"use strict";

	function fixInvalidKey(invalidKey, friendsService) {
		var userid;

		return Bluebird.try(function () {
			userid = friendsService.getUserForKey(invalidKey);
			return friendsService.removeFriend(userid);
		}).then(function () {
			return friendsService.friendship(userid);
		}).then(function () {
			console.log("fixed invalid key: " + invalidKey);
		});
	}

	return function ($injector) {
		var friendsService = $injector.get("ssn.friendsService");
		var keyStore = $injector.get("ssn.keyStoreService");
		var friendsKeys;

		return friendsService.awaitLoading().then(function () {
			friendsKeys = friendsService.getAllFriendShipKeys();
			return keyStore.upload.preLoadMultiple(friendsKeys);
		}).then(function () {
			var invalidKeys = friendsKeys.filter(function (realid) {
				return !keyStore.upload.isKeyLoaded(realid);
			});

			if (invalidKeys.length === 0) {
				return true;
			} else {
				return invalidKeys.reduce(function (previous, invalidKey) {
					return previous.then(function () {
						return fixInvalidKey(invalidKey, friendsService);
					});
				}, Bluebird.resolve());
			}
		}).then(function () {
			return true;
		});
	};
});
