define(["controllers/controllerModule", "whispeerHelper", "step", "asset/state"], function (circlesModule, h, step, State) {
	"use strict";

	function circlesCreateController($scope, circleService, errorService) {
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
				$scope.loadActiveCircle(circle.getID());
			}), errorService.criticalError);

			$scope.showCircle = !$scope.mobile;
		};
	}


	circlesCreateController.$inject = ["$scope", "ssn.circleService", "ssn.errorService"];

	circlesModule.controller("ssn.circlesCreateController", circlesCreateController);

});
