/**
* userController
**/

define(["bluebird", "bluebird", "asset/resizableImage", "asset/state", "user/userModule"], function (Bluebird, Promise, ResizableImage, State, userModule) {
	"use strict";

	function userFriendsController($scope, $stateParams, $timeout, cssService, errorService, userService) {
		var identifier = $stateParams.identifier;

		$scope.loadingFriends = true;

		userService.get(identifier).then(function (user) {
			return user.getFriends();
		}).then(function (friends) {
			return userService.getMultiple(friends);
		}).then(function (friends) {
			var i;
			$scope.friends = [];
			var parallel = [];

			for (i = 0; i < friends.length; i += 1) {
				$scope.friends.push(friends[i].data);
				parallel.push(friends[i].loadBasicData());
			}

			return Bluebird.all(parallel);
		}).then(function () {
			$scope.loadingFriends = false;
		});

		$scope.friends = [];
	}

	userFriendsController.$inject = ["$scope", "$stateParams", "$timeout", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.postService", "ssn.circleService", "ssn.blobService"];

	userModule.controller("ssn.userFriendsController", userFriendsController);
});
