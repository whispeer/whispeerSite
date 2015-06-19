/**
* postController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function postController($scope, $stateParams, cssService, postService, errorService) {
		cssService.setClass("mainView");

		function loadPost(postID) {
			step(function () {
				postService.getPostByID(postID, this);
			}, h.sF(function (post) {
				$scope.post = post.data;
				post.loadData(this);
			}), errorService.criticalError);
		}

		loadPost($stateParams.postID);
	}

	postController.$inject = ["$scope", "$stateParams", "ssn.cssService", "ssn.postService", "ssn.errorService"];

	controllerModule.controller("ssn.postController", postController);
});
