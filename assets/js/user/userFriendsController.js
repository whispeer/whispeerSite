/**
* userController
**/

define(["step", "whispeerHelper", "bluebird", "asset/resizableImage", "asset/state", "user/userModule"], function (step, h, Promise, ResizableImage, State, userModule) {
	"use strict";

	function userFriendsController($scope, $stateParams, $timeout, cssService, errorService, userService) {
		var identifier = $stateParams.identifier;

		$scope.loadingFriends = true;

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			user.getFriends(this);
		}), h.sF(function (friends) {
			userService.getMultiple(friends, this);
		}), h.sF(function (friends) {
			var i;
			$scope.friends = [];

			for (i = 0; i < friends.length; i += 1) {
				$scope.friends.push(friends[i].data);
				friends[i].loadBasicData(this.parallel());
			}

			this.parallel()();
		}), h.sF(function () {
			$scope.loadingFriends = false;
		}));

		$scope.friends = [];
	}

	userFriendsController.$inject = ["$scope", "$stateParams", "$timeout", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.postService", "ssn.circleService", "ssn.blobService"];

	userModule.controller("ssn.userFriendsController", userFriendsController);
});
