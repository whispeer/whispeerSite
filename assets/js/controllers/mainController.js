/**
* mainController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function mainController($scope, $state, $stateParams, cssService, postService, ImageUploadService, filterService, localize, settingsService, errorService) {
		cssService.setClass("mainView");

		$scope.postActive = false;
		$scope.filterActive = false;

		$scope.showDonateHint = false;

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

		$scope.sortByCommentTime = $stateParams.sortByCommentTime === "true" || settingsService.getBranch("sortByCommentTime");
		$scope.sortIcon = "fa-newspaper-o";

		$scope.toggleSort = function() {
			step(function () {
				$scope.sortByCommentTime = !$scope.sortByCommentTime;

				settingsService.updateBranch("sortByCommentTime", $scope.sortByCommentTime);

				$state.go(".", { sortByCommentTime: $scope.sortByCommentTime  }, { reload: false });

				reloadTimeline(this.parallel());
				settingsService.uploadChangedData(this.parallel());
			}, errorService.criticalError);
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

		$scope.dontWantToDonate = function () {
			//90 days
			var DONATELATERDIFF = 90 * 24 * 60 * 60 * 1000;

			$scope.showDonateHint = false;

			var donateSettings = settingsService.getBranch("donate");
			donateSettings.refused = true;
			donateSettings.later = new Date().getTime() + DONATELATERDIFF;
			settingsService.updateBranch("donate", donateSettings);

			settingsService.uploadChangedData(errorService.criticalError);
		};

		$scope.donateLater = function () {
			//2 Days
			var DONATELATERDIFF = 2 * 24 * 60 * 60 * 1000;

			$scope.showDonateHint = false;

			var donateSettings = settingsService.getBranch("donate");
			donateSettings.later = new Date().getTime() + DONATELATERDIFF;
			settingsService.updateBranch("donate", donateSettings);

			settingsService.uploadChangedData(errorService.criticalError);
		};

		function reloadTimeline(cb) {
			step(function () {
				if ($scope.filterSelection.length === 0) {
					$scope.filterSelection = ["always:allfriends"];
				}

				$scope.currentTimeline = postService.getTimeline($scope.filterSelection, $scope.sortByCommentTime);
				$scope.currentTimeline.loadInitial(this);
			}, h.sF(function () {
				var donateSettings = settingsService.getBranch("donate");

				$scope.showDonateHint = donateSettings.later < new Date().getTime();

				console.log(settingsService.getBranch("donate"));
			}), cb || errorService.criticalError);
		}

		reloadTimeline();
	}

	mainController.$inject = ["$scope", "$state", "$stateParams", "ssn.cssService", "ssn.postService", "ssn.imageUploadService", "ssn.filterService", "localize", "ssn.settingsService", "ssn.errorService"];

	controllerModule.controller("ssn.mainController", mainController);
});
