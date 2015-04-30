/**
* loginController
**/

define(["login/loginModule", "login/loginDataService"], function (loginModule) {
	"use strict";

	function loginController($scope, $location, loginDataService) {
		$scope.login = loginDataService;
		$scope.$watch(function () {
			return loginDataService.unknownName;
		}, function (val) {
			if (val) {
				jQuery("#mail").focus();
			}
		});

		$scope.$watch(function () {
			return loginDataService.wrongPassword;
		}, function (val) {
			if (val) {
				jQuery("#password").focus();
			}
		});
	}

	loginController.$inject = ["$scope", "$location", "ssn.loginDataService"];

	loginModule.controller("ssn.loginController", loginController);
});
