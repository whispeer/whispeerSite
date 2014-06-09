/**
* sessionController
**/

define([], function () {
	"use strict";

	function logoutController($scope, sessionHelper) {
		sessionHelper.logout();
	}

	logoutController.$inject = ["$scope", "ssn.sessionHelper"];

	return logoutController;
});