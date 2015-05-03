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
				jQuery("#mail").focus();
			}
		});

		if (loginDataService.identifier) {
			jQuery("#password").focus();
		} else {
			jQuery("#mail").focus();
		}

		$scope.$watch(function () {
			return loginDataService.failureCode === 1;
		}, function (val) {
			if (val) {
				jQuery("#password").focus();
			}
		});
	}

	loginController.$inject = ["$scope", "$location", "ssn.loginDataService"];

	loginModule.controller("ssn.loginController", loginController);
});
