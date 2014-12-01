/**
* friendsController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function friendsController($scope, cssService, friendsService, userService)  {
		cssService.setClass("friendsView");
		$scope.friends = [];
		$scope.requests = [];

		$scope.removeFriend = function (user) {
			user.user.removeAsFriend();
		};

		function loadFriendsUsers() {
			step(function () {
				var friends = friendsService.getFriends();
				userService.getMultipleFormatted(friends, this);
			}, h.sF(function (result) {
				$scope.friends = result;
			}));
		}

		function loadRequestsUsers() {
			step(function () {
				var requests = friendsService.getRequests();
				userService.getMultipleFormatted(requests, this);
			}, h.sF(function (result) {
				$scope.requests = result;
			}));
		}

		friendsService.listen(loadFriendsUsers);
		friendsService.listen(loadRequestsUsers);
		loadFriendsUsers();
		loadRequestsUsers();		

		$scope.acceptRequest = function (request) {
			request.user.acceptFriendShip();
		};
	}

	friendsController.$inject = ["$scope", "ssn.cssService", "ssn.friendsService", "ssn.userService"];

	return friendsController;
});