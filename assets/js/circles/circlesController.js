/**
* circlesController
**/

define(["whispeerHelper", "asset/state", "step", "controllers/controllerModule"], function (h, State, step, controllerModule) {
	"use strict";

	function circlesController($scope, cssService, circleService, errorService, localize) {
		var addUsersToCircleState = new State();
		$scope.addUsersToCircle = addUsersToCircleState.data;

		$scope.circleid = 0;
		$scope.showCircle = !$scope.mobile;

		$scope.editingTitle = {
			"success":		true,
			"failure":		false,
			"operation":	false,
			"active":		false
		};

		$scope.editTitle = function () {
			$scope.editingTitle.active = true;
		};

		$scope.saveTitle = function () {
			$scope.editingTitle.success = true;
			$scope.editingTitle.active = false;
		};

		$scope.thisCircle = {};

		$scope.getLength = function(obj) {
			return obj.length;
		};

		circleService.loadAll(errorService.criticalError);

		$scope.removeUser = function (user) {
			circleService.get($scope.circleid).removePersons([user.id], errorService.criticalError);
		};

		var usersToAdd;
		$scope.setUsersToAdd = function (users) {
			usersToAdd = users;
		};

		$scope.addUsers = function () {
			addUsersToCircleState.pending();

			step(function () {
				circleService.get($scope.circleid).addPersons(usersToAdd, this);
			}, h.sF(function () {
				$scope.$broadcast("resetSearch");
				this.ne();
			}), errorService.failOnError(addUsersToCircleState));
		};

		$scope.removeCircle = function () {
			var response = confirm(localize.getLocalizedString("views.circles.removeCircle"));
			if (response) {
				circleService.get($scope.circleid).remove(function (e) {
					errorService.criticalError(e);

					if (!e) {
						$scope.unloadCircle();
					}
				});
			}
		};

		$scope.unloadCircle = function () {
			$scope.showCircle = true;

			$scope.circleLoaded = false;
			$scope.thisCircle = {};
			$scope.circleid = 0;
		};

		$scope.unloadCircleMobile = function () {
			$scope.showCircle = false;

			$scope.circleLoaded = false;
			$scope.thisCircle = {};
			$scope.circleid = 0;
		};

		$scope.loadActiveCircle = function (id) {
			$scope.$broadcast("resetSearch");
			addUsersToCircleState = new State();
			$scope.addUsersToCircle = addUsersToCircleState.data;

			$scope.showCircle = true;
			$scope.circleLoaded = true;
			$scope.circleid = id;

			circleService.get(id).loadPersons(function () {
				console.log("loaded");
			});
			$scope.thisCircle = circleService.get(id).data;
		};

		$scope.isActiveCircle = function (id) {
			return $scope.circleid === id;
		};
	}

	circlesController.$inject = ["$scope", "ssn.cssService", "ssn.circleService", "ssn.errorService", "localize"];

	controllerModule.controller("ssn.circlesController", circlesController);
});
