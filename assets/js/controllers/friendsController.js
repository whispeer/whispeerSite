/**
* friendsController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function friendsController($scope, cssService, friendsService, userService)  {
		cssService.setClass("friendsView");

		function loadFriendsUsers() {
			step(function () {
				var friends = friendsService.getFriends();
				userService.getMultipleFormatted(friends, this);
			}, h.sF(function (result) {
				$scope.friends = result;
			}));
		}

		loadFriendsUsers();

		$scope.friends = [
			/*{
				"name": "Willi Welle",
				"mutualFriends":	"295",
				"image":	"/assets/img/user.png"
				//"lists":	[""] // ID's of the Lists with this friend
			}*/
		];
	}

	friendsController.$inject = ["$scope", "ssn.cssService", "ssn.friendsService", "ssn.userService"];

	return friendsController;
});