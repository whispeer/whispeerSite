/**
* mainController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function mainController($scope, $state, $stateParams, cssService, postService, ImageUploadService, filterService, localize, settingsService, errorService) {
		cssService.setClass("mainView");

		$scope.postActive = false;
		$scope.filterActive = false;

		var applyFilterState = new State();
		$scope.applyFilterState = applyFilterState.data;

		$scope.filterSelection = settingsService.getBranch("filterSelection");

		$scope.getFiltersByID = filterService.getFiltersByID;

		$scope.focusNewPost = function () {
			var textarea = jQuery("#newsfeedView-postForm textarea");
			var scope = textarea.scope();

			textarea.focus();
			scope.newPost.text = localize.getLocalizedString("general.zeroContent.firstPostText", {});
			scope.$apply();
		};

		$scope.setTimelineFilter = function (newSelection) {
			$scope.filterSelection = newSelection;
		};

		$scope.applyFilter = function () {
			step(function () {
				settingsService.updateBranch("filterSelection", $scope.filterSelection);

				reloadTimeline(this.parallel());
				settingsService.uploadChangedData(this.parallel());
			}, errorService.failOnError(applyFilterState));
			// TODO: Save for later
		};

		$scope.sortByCommentTime = $stateParams.sortByCommentTime === "true";
		$scope.sortIcon = "fa-newspaper-o";

		$scope.toggleSort = function() {
			$scope.sortByCommentTime = !$scope.sortByCommentTime;

			$state.go(".", { sortByCommentTime: $scope.sortByCommentTime  }, { reload: false });

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

		function reloadTimeline(cb) {
			step(function () {
				if ($scope.filterSelection.length === 0) {
					$scope.filterSelection = ["always:allfriends"];
				}

				$scope.currentTimeline = postService.getTimeline($scope.filterSelection, $scope.sortByCommentTime);
				$scope.currentTimeline.loadInitial(this);
			}, cb || errorService.criticalError);
		}

		reloadTimeline();
	}

	mainController.$inject = ["$scope", "$state", "$stateParams", "ssn.cssService", "ssn.postService", "ssn.imageUploadService", "ssn.filterService", "localize", "ssn.settingsService", "ssn.errorService"];

	controllerModule.controller("ssn.mainController", mainController);
});
