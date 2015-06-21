define(["controllers/controllerModule", "whispeerHelper", "step", "asset/state"], function (circlesModule, h, step, State) {
	"use strict";

	function circlesListController($scope, circleService, errorService) {
		$scope.circles = circleService.data.circles;

		circleService.loadAll(errorService.criticalError);
	}


	circlesListController.$inject = ["$scope", "ssn.circleService", "ssn.errorService"];

	circlesModule.controller("ssn.circlesListController", circlesListController);

});
