/**
* startController
**/

define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function startController($scope, sessionHelper, cssService) {
		cssService.setClass("startView");
	}

	startController.$inject = ["$scope", "ssn.sessionHelper", "ssn.cssService"];

	controllerModule.controller("ssn.startController", startController);
});
