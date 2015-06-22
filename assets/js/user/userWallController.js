/**
* userWallController
**/

define(["step", "whispeerHelper", "bluebird", "asset/resizableImage", "asset/state", "user/userModule"], function (step, h, Promise, ResizableImage, State, userModule) {
	"use strict";

	function userWallController($scope, $stateParams, errorService, userService, postService) {
		var userObject, identifier = $stateParams.identifier;

		$scope.posts = [];
		$scope.loadingPosts = true;

		$scope.loadMorePosts = function () {
			if ($scope.loadingPosts) {
				return;
			}

			$scope.loadingPosts = true;

			step(function () {
				postService.getWallPosts(h.array.last($scope.posts).id, userObject.getID(), 5, this);
			}, h.sF(function (posts) {
				$scope.posts = $scope.posts.concat(posts);
				this.ne();
			}), function () {
				$scope.loadingPosts = false;
			});
		};

		function startLoading() {
			step(function () {
				userService.get(identifier, this);
			}, h.sF(function (user) {
				userObject = user;

				postService.getWallPosts(0, userObject.getID(), 5, this);
			}), h.sF(function (posts) {
				$scope.posts = posts;
				this.ne();
			}), function () {
				$scope.loadingPosts = false;
			});
		}

		$scope.$watch(function () {
			return $scope.loading;
		}, function (isUserLoading) {
			if (!isUserLoading) {
				startLoading();
			}
		});
	}

	userWallController.$inject = ["$scope", "$stateParams", "ssn.errorService", "ssn.userService", "ssn.postService"];

	userModule.controller("ssn.userWallController", userWallController);
});
