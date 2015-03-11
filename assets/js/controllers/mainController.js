/**
* mainController
**/

define(["step", "whispeerHelper", "asset/state"], function (step, h, State) {
	"use strict";

	function mainController($scope, cssService, postService, ImageUploadService, errorService, screenSize) {
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
			addImages: ImageUploadService.fileCallback(function (newImages) {
				$scope.$apply(function () {
					$scope.newPost.images = $scope.newPost.images.concat(newImages);
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

		var firstTimeUpload = true;

		$scope.mobilePromptUser = function ($event) {
			if (screenSize.mobile && firstTimeUpload && !window.confirm("Uploading files on mobile can drain battery. Are you sure?")) {
				$event.preventDefault();
			} else {
				firstTimeUpload = false;
			}
		};

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

			if ($scope.canSend) {
				$scope.canSend = false;

				var images = $scope.newPost.images;

				postService.createPost($scope.newPost.text, $scope.newPost.readers, 0, images).then(function () {
					$scope.newPost.text = "";
					$scope.newPost.images = [];
				}).catch(function (e) {
					debugger;
					sendPostState.failed();
				})
				.then(sendPostState.success.bind(sendPostState))
				.finally(function () {
					$scope.canSend = true;
					$scope.postActive = false;
					$scope.$apply();
				});
			}
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

	mainController.$inject = ["$scope", "ssn.cssService", "ssn.postService", "ssn.imageUploadService", "ssn.errorService", "ssn.screenSizeService"];

	return mainController;
});