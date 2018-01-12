"use strict";

import filterService from "services/filter.service.ts"
import ImageUpload from "services/imageUpload.service"

const templateUrl = require("../../views/directives/newPost.html")
const postService = require("services/postService")
const directivesModule = require("directives/directivesModule")
const State = require("asset/state");

function newPostDirective() {
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
					addImages: ImageUpload.fileCallback(function (files) {
						$scope.$applyAsync(() => {
							$scope.newPost.images = $scope.newPost.images.concat(files.map((file) => new ImageUpload(file)));
						});
					})
				};


				var sendPostState = new State.default();
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

					var visibleSelection = $scope.newPost.readers.slice();

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

newPostDirective.$inject = [];

directivesModule.directive("newpost", newPostDirective);
