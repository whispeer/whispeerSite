/**
* mainController
**/

define([], function () {
	"use strict";

	function mainController($scope, cssService, postService) {
		cssService.setClass("mainView");

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

		$scope.sendPost = function () {
			postService.createPost($scope.newPost.text, $scope.newPost.readers, 0, function (err, post) {
				if (err) {
					debugger;
				} else {
					$scope.newPost.text = "";
				}

				console.log(post);
			});

			$scope.postActive = false;
		};
		$scope.toggleFilter = function() {
			$scope.filterActive = !$scope.filterActive;
		};

		function reloadTimeline() {
			postService.getTimelinePosts(0, $scope.filterSelection, function (err, posts) {
				$scope.posts = posts;
			});
		}

		reloadTimeline();

		$scope.posts = [];
	}

	mainController.$inject = ["$scope", "ssn.cssService", "ssn.postService"];

	return mainController;
});