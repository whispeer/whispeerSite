/**
* sessionController
**/

define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function logoutController($scope, sessionHelper) {
		sessionHelper.logout();
	}

	logoutController.$inject = ["$scope", "ssn.sessionHelper"];

	controllerModule.controller("ssn.logoutController", logoutController);
});
