/**
* mainController
**/

define(["step", "whispeerHelper", "asset/state"], function (step, h, State) {
	"use strict";

	function mainController($scope, cssService, postService, errorService) {
		cssService.setClass("mainView");

		$scope.canSend = true;

		var sendPostState = new State();
		$scope.sendPostState = sendPostState.data;

		$scope.postActive = false;
		$scope.filterActive = false;
		$scope.newPost = {
			text: "",
			readers: ["always:allfriends"]
		};

		$scope.filterSelection = ["always:allfriends"];

		$scope.$on("selectionChange:postReaders", function (event, newSelection) {
			$scope.newPost.readers = newSelection.map(function (e) {
				return e.id;
			});
		});

		$scope.$on("selectionChange:timelineFilter", function (event, newSelection) {
			$scope.filterSelection = newSelection.map(function (e) {
				return e.id;
			});

			reloadTimeline();
		});

		$scope.togglePost = function() {
			$scope.postActive = !$scope.postActive;
		};

		$scope.loadMorePosts = function () {
			$scope.currentTimeline.loadMorePosts(errorService.criticalError);
		};

		$scope.sendPost = function () {
			sendPostState.pending();

			if ($scope.newPost.text === "") {
				sendPostState.failed();
				return;
			}

			step(function () {
				if ($scope.canSend) {
					$scope.canSend = false;

					postService.createPost($scope.newPost.text, $scope.newPost.readers, 0, this);

					$scope.postActive = false;
				}
			}, h.sF(function (e) {
				$scope.canSend = true;

				if (!e) {
					$scope.newPost.text = "";
				}

				this(e);
			}), errorService.failOnError(sendPostState));
		};
		$scope.toggleFilter = function() {
			$scope.filterActive = !$scope.filterActive;
		};

		$scope.currentTimeline = null;

		function reloadTimeline() {
			step(function () {
				$scope.currentTimeline = postService.getTimeline($scope.filterSelection);
				$scope.currentTimeline.loadInitial(this);
			}, errorService.criticalError);
		}

		reloadTimeline();
	}

	mainController.$inject = ["$scope", "ssn.cssService", "ssn.postService", "ssn.errorService"];

	return mainController;
});