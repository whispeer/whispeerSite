/**
* postController
**/

var cssService = require("services/css.service").default;
var errorService = require("services/error.service").errorServiceInstance;
var postService = require("services/postService");

define(["bluebird", "asset/state", "controllers/controllerModule"], function (Bluebird, State, controllerModule) {
	"use strict";

	function postController($scope, $stateParams) {
		cssService.setClass("mainView");

		function loadPost(postID) {
			return postService.getPostByID(postID).then(function (post) {
				$scope.post = post.data;

				return post.loadData();
			}).catch(errorService.criticalError);
		}

		loadPost($stateParams.postID);
	}

	postController.$inject = ["$scope", "$stateParams"];

	controllerModule.controller("ssn.postController", postController);
});
