/**
* loginController
**/

define([
	"login/loginModule",
	"login/loginDataService"
], function (loginModule) {
	"use strict";

	function loginController($scope, $location, loginDataService) {
		$scope.$watch(function () {
			return loginDataService.failureCode === 0;
		}, function (val) {
			if (val) {
				document.getElementById("mail").focus();
			}
		});

		$scope.$watch(function () {
			return loginDataService.failureCode === 1;
		}, function (val) {
			if (val) {
				document.getElementById("password").focus();
			}
		});

		loginDataService.loadedStorage.then(function () {
			var focus = window.top.whispeerStopAutoFocus;

			if ($scope.login) {
				if ($scope.login.identifier) {
					loginDataService.identifier = $scope.login.identifier;
					focus = true;
				}

				if ($scope.login.password) {
					loginDataService.password = $scope.login.password;
					focus = true;
				}
			}

			$scope.login = loginDataService;

			if (focus) {
				return;
			}

			if (loginDataService.identifier) {
				document.getElementById("password").focus();
			} else {
				document.getElementById("mail").focus();
			}
		});
	}

	loginController.$inject = ["$scope", "$location", "ssn.loginDataService"];

	loginModule.controller("ssn.loginController", loginController);
});
