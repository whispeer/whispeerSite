define(["controllers/controllerModule", "whispeerHelper", "step"], function (circlesModule, h, step) {
	"use strict";

	function circlesCreateController($scope, circleService, errorService, $state) {
		$scope.circleName = "";
		$scope.selectedUsers = [];

		$scope.setCreateNewUsers = function (selected) {
			$scope.selectedUsers = selected;
		};

		$scope.createNew = function (name) {
			step(function () {
				var ids = $scope.selectedUsers.map(h.parseDecimal);
				circleService.create(name, this, ids);
			}, h.sF(function (circle) {
				$state.go("app.circles.show", {circleid: circle.getID()});
			}), errorService.criticalError);

			$scope.showCircle = !$scope.mobile;
		};
	}


	circlesCreateController.$inject = ["$scope", "ssn.circleService", "ssn.errorService", "$state"];

	circlesModule.controller("ssn.circlesCreateController", circlesCreateController);

});
