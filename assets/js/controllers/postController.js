/**
* postController
**/

define(["bluebird", "asset/state", "controllers/controllerModule"], function (Bluebird, State, controllerModule) {
	"use strict";

	function postController($scope, $stateParams, cssService, postService, errorService) {
		cssService.setClass("mainView");

		function loadPost(postID) {
			return postService.getPostByID(postID).then(function (post) {
				$scope.post = post.data;

				return post.loadData();
			}).catch(errorService.criticalError);
		}

		loadPost($stateParams.postID);
	}

	postController.$inject = ["$scope", "$stateParams", "ssn.cssService", "ssn.postService", "ssn.errorService"];

	controllerModule.controller("ssn.postController", postController);
});
