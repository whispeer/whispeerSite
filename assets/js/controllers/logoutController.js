/**
* sessionController
**/

define([], function () {
	"use strict";

	function logoutController($scope, sessionHelper) {
		debugger;
		sessionHelper.logout();
	}

	logoutController.$inject = ["$scope", "ssn.sessionHelper"];

	return logoutController;
});