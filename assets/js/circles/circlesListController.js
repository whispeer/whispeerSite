define(["controllers/controllerModule"], function (circlesModule) {
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
