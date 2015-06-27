/**
* mainController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function mainController($scope, cssService, postService, ImageUploadService, filterService, localize, errorService) {
		cssService.setClass("mainView");

		$scope.postActive = false;
		$scope.filterActive = false;

		$scope.filterSelection = ["always:allfriends"];

		$scope.focusNewPost = function () {
			var textarea = jQuery("#newsfeedView-postForm textarea");
			var scope = textarea.scope();

			textarea.focus();
			scope.newPost.text = localize.getLocalizedString("general.zeroContent.firstPostText", {});
			scope.$apply();
		};

		$scope.setTimelineFilter = function (newSelection) {
			$scope.filterSelection = newSelection;
			reloadTimeline();
		};

		$scope.togglePost = function() {
			$scope.postActive = !$scope.postActive;
		};

		$scope.loadMorePosts = function () {
			$scope.currentTimeline.loadMorePosts(errorService.criticalError);
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

	mainController.$inject = ["$scope", "ssn.cssService", "ssn.postService", "ssn.imageUploadService", "ssn.filterService", "localize", "ssn.errorService"];

	controllerModule.controller("ssn.mainController", mainController);
});
