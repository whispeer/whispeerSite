/**
* startController
**/

define([], function () {
	"use strict";

	function startController($scope, sessionHelper, cssService) {
		cssService.setClass("registerView");

		//gui show stuff
		$scope.loginForm = "login";
		$scope.showLogin = function showLoginForm() {
			$scope.loginForm = "login";
			$scope.registrationStep = 1;
		};

		$scope.showRegister = function showRegisterForm() {
			$scope.loginForm = "register";
			$scope.registrationStep = 1;
		};
		
		$scope.showMoreInfo = function showMoreInfo() {
			$scope.loginForm = "moreInfo";
			$scope.registrationStep = 1;
		};
	}

	startController.$inject = ["$scope", "ssn.sessionHelper", "ssn.cssService"];

	return startController;
});