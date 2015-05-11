/**
* loginController
**/

define([
	"login/loginModule",
	"login/loginDataService"
], function (loginModule) {
	"use strict";

	function loginController($scope, $location, loginDataService) {
		$scope.login = loginDataService;
		$scope.$watch(function () {
			return loginDataService.failureCode === 0;
		}, function (val) {
			if (val) {
				document.getElementById("mail").focus();
			}
		});

		if (loginDataService.identifier) {
			document.getElementById("password").focus();
		} else {
			document.getElementById("mail").focus();
		}

		$scope.$watch(function () {
			return loginDataService.failureCode === 1;
		}, function (val) {
			if (val) {
				document.getElementById("password").focus();
			}
		});
	}

	loginController.$inject = ["$scope", "$location", "ssn.loginDataService"];

	loginModule.controller("ssn.loginController", loginController);
});
