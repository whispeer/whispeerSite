define(["controllers/controllerModule", "whispeerHelper", "bluebird"], function (circlesModule, h, Bluebird) {
	"use strict";

	function circlesListController($scope, circleService, errorService) {
		$scope.loadingCircleList = true;
		$scope.circles = circleService.data.circles;

		circleService.loadAll().then(function() {
			$scope.loadingCircleList = false;
		}).catch(errorService.criticalError);
	}


	circlesListController.$inject = ["$scope", "ssn.circleService", "ssn.errorService"];

	circlesModule.controller("ssn.circlesListController", circlesListController);

});
