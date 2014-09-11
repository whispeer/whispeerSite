/**
* loginController
**/

define(["step"], function (step) {
	"use strict";

	function loginController($scope, errorService, sessionHelper, cssService) {
		//cssService.setClass("registerView");

		$scope.password = "";

		$scope.identifier = "";

		$scope.loginFailed = false;
		$scope.loginSuccess = false;

		function loginFailed() {
			$scope.loginFailed = true;
			$scope.loginSuccess = false;
		}

		function loginSuccess() {
			$scope.loginFailed = false;
			$scope.loginSuccess = true;
		}

		$scope.login = function loginCF(identifier, password) {
			step(function () {
				sessionHelper.login(identifier, password, this);
			}, function (e) {
				if (e) {
					loginFailed();
				} else {
					loginSuccess();
				}
			});
		};
	}

	loginController.$inject = ["$scope", "ssn.errorService", "ssn.sessionHelper", "ssn.cssService"];

	return loginController;
});