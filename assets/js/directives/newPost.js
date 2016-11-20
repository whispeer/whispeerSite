var templateUrl = require("../../views/directives/newPost.html");

define(["directives/directivesModule", "whispeerHelper", "asset/state"], function (directivesModule, h, State) {
	"use strict";

	function newPostDirective(postService, ImageUploadService, filterService) {
		return {
			scope: {
				"inputI18nAttr": "@",
				"addClasses": "@",
				"wallUserId": "="
			},
			restrict: "E",
			templateUrl: templateUrl,
			replace: false,
			transclude: false,
			link: {
				pre: function ($scope) {
					$scope.canSend = true;
					$scope.getFiltersByID = filterService.getFiltersByID;

					$scope.newPost = {
						text: "",
						readers: ["always:allfriends"],
						images: [],
						rotateImage: function (index) {
							var image = $scope.newPost.images[index];
							image.rotate();
						},
						removeImage: function (index) {
							$scope.newPost.images.splice(index, 1);
						},
						addImages: ImageUploadService.fileCallback(function (newImages) {
							$scope.$apply(function () {
								$scope.newPost.images = $scope.newPost.images.concat(newImages);
							});
						})
					};


					var sendPostState = new State();
					$scope.sendPostState = sendPostState.data;

					$scope.setPostReaders = function (newSelection) {
						$scope.newPost.readers = newSelection;
					};

					$scope.sendPost = function () {
						var images = $scope.newPost.images, wallUserId = 0;
						sendPostState.pending();

						if ($scope.newPost.text === "" && images.length === 0) {
							sendPostState.failed();
							return;
						}

						var visibleSelection = $scope.newPost.readers;

						if ($scope.wallUserId) {
							wallUserId = $scope.wallUserId;
							visibleSelection.push("friends:" + wallUserId);
						}

						if ($scope.canSend) {
							$scope.canSend = false;

							postService.createPost($scope.newPost.text, visibleSelection, wallUserId, images).then(function () {
								$scope.newPost.text = "";
								$scope.newPost.images = [];
							}).catch(function (e) {
								console.error(e);
								sendPostState.failed();
							})
							.then(sendPostState.success.bind(sendPostState))
							.finally(function () {
								$scope.canSend = true;
								$scope.postActive = false;
							});
						}
					};
				}
			}
		};
	}

	newPostDirective.$inject = ["ssn.postService", "ssn.imageUploadService", "ssn.filterService"];

	directivesModule.directive("newpost", newPostDirective);
});
