define(["step", "whispeerHelper"], function (step, h) {
	"use strict";
	return function ($injector, cb) {
		var friendsService = $injector.get("ssn.friendsService");
		var keyStore = $injector.get("ssn.keyStoreService");
		var friendsKeys;

		var userid, invalidKey;

		step(function () {
			friendsKeys = friendsService.getAllFriendShipKeys();
			keyStore.upload.preLoadMultiple(friendsKeys, this);
		}, h.sF(function () {

			var invalidKeys = friendsKeys.filter(function (realid) {
				return !keyStore.upload.isKeyLoaded(realid);
			});

			if (invalidKeys.length === 0) {
				this.last.ne(true);
			} else {
				this.ne(invalidKeys);
			}
		}), h.sF(function (invalidKeys) {
			invalidKey = invalidKeys[0];
			userid = friendsService.getUserForKey(invalidKey);
			friendsService.removeFriend(userid, this);
		}), h.sF(function () {
			friendsService.friendship(userid, this);
		}), h.sF(function () {
			console.log("fixed invalid key: " + invalidKey);
		}), cb);
	};
});