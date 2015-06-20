define(["controllers/controllerModule", "whispeerHelper", "step", "asset/state"], function (circlesModule, h, step, State) {
	"use strict";

	function circlesShowController($scope, circleService, errorService, localize, $stateParams, $state) {
		var addUsersToCircleState = new State();
		$scope.addUsersToCircle = addUsersToCircleState.data;

		$scope.circleid = 0;

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
			step(function () {
				var response = confirm(localize.getLocalizedString("views.circles.removeCircle"));
				if (response) {
					circleService.get($scope.circleid).remove(this);
				}
			}, h.sF(function () {
				if ($scope.mobile) {
					$state.go("app.circles.list");
				} else {
					$state.go("app.circles.new");
				}
			}), errorService.criticalError);
		};

		$scope.loadActiveCircle = function (id) {
			$scope.circleid = id;

			step(function () {
				circleService.loadAll(this);
			}, h.sF(function () {
				var theCircle = circleService.get(id);
				$scope.thisCircle = theCircle.data;
				theCircle.loadPersons(this);
			}), errorService.criticalError);
		};

		$scope.loadActiveCircle($stateParams.circleid);
	}


	circlesShowController.$inject = ["$scope", "ssn.circleService", "ssn.errorService", "localize", "$stateParams", "$state"];

	circlesModule.controller("ssn.circlesShowController", circlesShowController);

});
