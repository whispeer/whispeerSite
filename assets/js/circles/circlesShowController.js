define(["controllers/controllerModule", "whispeerHelper", "step", "asset/state"], function (circlesModule, h, step, State) {
	"use strict";

	function circlesShowController($scope, circleService, errorService, localize, $stateParams, $state) {
		var addUsersToCircleState = new State();
		$scope.addUsersToCircle = addUsersToCircleState.data;

		$scope.circleid = $stateParams.circleid;
		$scope.thisCircle = {};
		$scope.circleLoading = true;

		step(function () {
			circleService.loadAll(this);
		}, h.sF(function () {
			var theCircle = circleService.get($stateParams.circleid);
			$scope.thisCircle = theCircle.data;
			theCircle.loadPersons(this);
		}), h.sF(function () {
			$scope.circleLoading = false;
		}), errorService.criticalError);

		$scope.editingTitle = {
			"success":		true,
			"failure":		false,
			"operation":	false,
			"active":		false
		};

		$scope.getPerson = function (id) {
			var user = $scope.thisCircle.persons.filter(function (user) {
				return user.id === id;
			});

			if (user.length === 1) {
				return user[0];
			}

			var notExisting = $scope.thisCircle.persons.filter(function (user) {
				return user.notExisting;
			});

			if (notExisting.length > 0) {
				return notExisting[0];
			}
		};

		$scope.editTitle = function () {
			$scope.editingTitle.active = true;
		};

		$scope.saveTitle = function () {
			$scope.editingTitle.success = true;
			$scope.editingTitle.active = false;
		};

		$scope.getLength = function(obj) {
			return obj.length;
		};

		$scope.removeUser = function (userID) {
			circleService.get($scope.circleid).removePersons([userID], errorService.criticalError);
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
	}


	circlesShowController.$inject = ["$scope", "ssn.circleService", "ssn.errorService", "localize", "$stateParams", "$state"];

	circlesModule.controller("ssn.circlesShowController", circlesShowController);

});
