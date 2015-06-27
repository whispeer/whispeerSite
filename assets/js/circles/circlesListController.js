define(["controllers/controllerModule", "whispeerHelper", "step", "asset/state"], function (circlesModule, h, step, State) {
	"use strict";

	function circlesListController($scope, circleService, errorService) {
		$scope.loadingCircleList = true;
		$scope.circles = circleService.data.circles;

		step(function () {
			circleService.loadAll(this);
		}, h.sF(function () {
			$scope.loadingCircleList = false;
		}), errorService.criticalError);
	}


	circlesListController.$inject = ["$scope", "ssn.circleService", "ssn.errorService"];

	circlesModule.controller("ssn.circlesListController", circlesListController);

});
