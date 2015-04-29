/**
* loginController
**/

define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function loginController($scope, $location, loginDataService, cssService) {
		if ($location.path() === "/login") {
			cssService.setClass("loginView");
		}

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

	loginController.$inject = ["$scope", "$location", "ssn.loginDataService", "ssn.cssService"];

	controllerModule.controller("ssn.loginController", loginController);
});
