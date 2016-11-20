/**
* mainController
**/

define(["bluebird", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (Bluebird, h, State, controllerModule) {
	"use strict";

	function mainController($scope, $state, $stateParams, cssService, postService, ImageUploadService, filterService, localize, settingsService, errorService) {
		cssService.setClass("mainView");

		function reloadTimeline(cb) {
			return Bluebird.try(function() {
				if ($scope.filterSelection.length === 0) {
					$scope.filterSelection = ["always:allfriends"];
				}

				$scope.currentTimeline = postService.getTimeline($scope.filterSelection, $scope.sortByCommentTime);
				return $scope.currentTimeline.loadInitial();
			}).then(function () {
				var donateSettings = settingsService.getBranch("donate");

				$scope.showDonateHint = $scope.currentTimeline.displayDonateHint && donateSettings.later < new Date().getTime();
			}).catch(
				errorService.criticalError
			).nodeify(cb);
		}

		$scope.postActive = false;
		$scope.filterActive = false;

		$scope.showDonateHint = false;

		var applyFilterState = new State();
		$scope.applyFilterState = applyFilterState.data;

		$scope.filterSelection = settingsService.getBranch("filterSelection");

		$scope.getFiltersByID = filterService.getFiltersByID;

		$scope.donateType = "donatePage.";

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
			var filterPromise = Bluebird.try(function() {
				settingsService.updateBranch("filterSelection", $scope.filterSelection);

				return Bluebird.all([
					reloadTimeline(),
					settingsService.uploadChangedData()
				]);
			});

			return errorService.failOnErrorPromise(applyFilterState, filterPromise);
			// TODO: Save for later
		};

		$scope.sortByCommentTime = $stateParams.sortByCommentTime === "true" || settingsService.getBranch("sortByCommentTime");
		$scope.sortIcon = "fa-newspaper-o";

		$scope.toggleSort = function() {
			return Bluebird.try(function () {
				$scope.sortByCommentTime = !$scope.sortByCommentTime;

				settingsService.updateBranch("sortByCommentTime", $scope.sortByCommentTime);

				$state.go(".", { sortByCommentTime: $scope.sortByCommentTime  }, { reload: false });

				return Bluebird.all([
					reloadTimeline(),
					settingsService.uploadChangedData()
				]);
			}).catch(errorService.criticalError);
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

		reloadTimeline();
	}

	mainController.$inject = ["$scope", "$state", "$stateParams", "ssn.cssService", "ssn.postService", "ssn.imageUploadService", "ssn.filterService", "localize", "ssn.settingsService", "ssn.errorService"];

	controllerModule.controller("ssn.mainController", mainController);
});
