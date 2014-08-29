/**
* startController
**/

define([], function () {
	"use strict";

	function startController($scope, sessionHelper, cssService) {
		cssService.setClass("startView");
		$scope.registerState = {
			step: 1
		};
	}

	startController.$inject = ["$scope", "ssn.sessionHelper", "ssn.cssService"];

	return startController;
});