/**
* mainController
**/

define(["step", "whispeerHelper", "asset/state", "asset/Image"], function (step, h, State, MyImage) {
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
			readers: ["always:allfriends"],
			images: [],
			removeImage: function (index) {
				$scope.newPost.images.splice(index, 1);
			},
			addImages: MyImage.callBackForMultipleFiles(function (e, newImages) {
				newImages.forEach(function (newImage) {
					$scope.newPost.images.push({
						name: newImage._name,
						data: newImage
					});
				});
			})
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
			sendPostState.pending();

			if ($scope.newPost.text === "") {
				sendPostState.failed();
				return;
			}

			step(function () {
				if ($scope.canSend) {
					$scope.canSend = false;

					var images = $scope.newPost.images.map(function (i) { return i.data; });

					postService.createPost($scope.newPost.text, $scope.newPost.readers, 0, this, images);

					$scope.postActive = false;
				}
			}, function (e) {
				$scope.canSend = true;

				if (!e) {
					$scope.newPost.text = "";
				}

				this(e);
			}, errorService.failOnError(sendPostState));
		};
		$scope.toggleFilter = function() {
			$scope.filterActive = !$scope.filterActive;
		};

		function reloadTimeline() {
			postService.getTimelinePosts(0, $scope.filterSelection, function (err, posts) {
				$scope.posts = posts;
			});
		}

		$scope.posts = [];
	}

	mainController.$inject = ["$scope", "ssn.cssService", "ssn.postService", "ssn.errorService"];

	return mainController;
});