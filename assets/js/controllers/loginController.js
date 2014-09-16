/**
* loginController
**/

define([], function () {
	"use strict";

	function loginController($scope, $location, loginDataService, cssService) {
		if ($location.path() === "/login") {
			cssService.setClass("loginView");
		}

		$scope.login = loginDataService;
	}

	loginController.$inject = ["$scope", "$location", "ssn.loginDataService", "ssn.cssService"];

	return loginController;
});