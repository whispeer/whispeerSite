define(["controllers/controllerModule", "whispeerHelper", "bluebird"], function (circlesModule, h, Bluebird) {
	"use strict";

	function circlesCreateController($scope, circleService, errorService, $state) {
		$scope.circleName = "";
		$scope.selectedUsers = [];

		$scope.setCreateNewUsers = function (selected) {
			$scope.selectedUsers = selected;
		};

		$scope.createNew = function (name) {
			$scope.showCircle = !$scope.mobile;

			Bluebird.try(function() {
				var ids = $scope.selectedUsers.map(h.parseDecimal);
				return circleService.create(name, ids);
			}).then(function (circle) {
				$state.go("app.circles.show", {circleid: circle.getID()});
			}).catch(errorService.criticalError);
		};
	}


	circlesCreateController.$inject = ["$scope", "ssn.circleService", "ssn.errorService", "$state"];

	circlesModule.controller("ssn.circlesCreateController", circlesCreateController);

});
