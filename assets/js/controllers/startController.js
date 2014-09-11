/**
* startController
**/

define([], function () {
	"use strict";

	function startController($scope, sessionHelper, cssService) {
		cssService.setClass("startView");
	}

	startController.$inject = ["$scope", "ssn.sessionHelper", "ssn.cssService"];

	return startController;
});