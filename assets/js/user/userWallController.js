/**
* userWallController
**/

define(["step", "whispeerHelper", "bluebird", "asset/resizableImage", "asset/state", "user/userModule"], function (step, h, Promise, ResizableImage, State, userModule) {
	"use strict";

	function userWallController($scope, $stateParams, errorService, userService, postService) {
		var userObject, identifier = $stateParams.identifier;

		$scope.newPost = {
			text: ""
		};

		var sendPostState = new State();
		$scope.sendPostState = sendPostState.data;

		$scope.sendPost = function () {
			sendPostState.pending();

			var visibleSelection = ["always:allfriends"], wallUserID = 0;

			if ($scope.newPost.text === "") {
				sendPostState.failed();
				return;
			}

			if (!$scope.user.me) {
				wallUserID = $scope.user.id;
				visibleSelection.push("friends:" + $scope.user.id);
			}

			postService.createPost($scope.newPost.text, visibleSelection, wallUserID, []).then(function () {
				$scope.newPost.text = "";
			}).catch(sendPostState.failed.bind(sendPostState))
			.then(sendPostState.success.bind(sendPostState))
			.finally(function () {
				$scope.$apply();
			});
		};

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			userObject = user;

			postService.getWallPosts(0, userObject.getID(), this);
		}), h.sF(function (posts) {
			$scope.posts = posts;
		}));

		$scope.posts = [];
		$scope.friends = [];
	}

	userWallController.$inject = ["$scope", "$stateParams", "ssn.errorService", "ssn.userService", "ssn.postService"];

	userModule.controller("ssn.userWallController", userWallController);
});
