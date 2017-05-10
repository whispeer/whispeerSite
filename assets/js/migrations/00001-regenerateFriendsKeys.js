var Bluebird = require("bluebird");

var friendsService = require("services/friendsService");
var keyStore = require("services/keyStore.service").default;

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

module.exports = function () {
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
