/**
* friendsController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function friendsController($scope, cssService, friendsService, userService)  {
		cssService.setClass("friendsView");
		$scope.friends = [];

		function loadFriendsUsers() {
			step(function () {
				var friends = friendsService.getFriends();
				userService.getMultipleFormatted(friends, this);
			}, h.sF(function (result) {
				$scope.friends = result;
			}));
		}

		friendsService.listen(loadFriendsUsers);
		loadFriendsUsers();
	}

	friendsController.$inject = ["$scope", "ssn.cssService", "ssn.friendsService", "ssn.userService"];

	return friendsController;
});