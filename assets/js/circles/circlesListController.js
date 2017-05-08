var circleService = require("circles/circleService");
var errorService = require("services/error.service").errorServiceInstance;

define(["controllers/controllerModule"], function (circlesModule) {
	"use strict";

	function circlesListController($scope) {
		$scope.loadingCircleList = true;
		$scope.circles = circleService.data.circles;

		circleService.loadAll().then(function() {
			$scope.loadingCircleList = false;
		}).catch(errorService.criticalError);
	}


	circlesListController.$inject = ["$scope"];

	circlesModule.controller("ssn.circlesListController", circlesListController);

});
