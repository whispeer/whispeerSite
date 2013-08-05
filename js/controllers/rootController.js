/**
* sessionController
**/

define(["step", "helper"], function (step, h) {
	"use strict";

	function rootController($scope, sessionService, sessionHelper, userService) {
		$scope.loggedin = false;
		$scope.username = "";

		$scope.$on("ssn.login", function () {
			$scope.loggedin = sessionService.isLoggedin();
			step(function () {
				if ($scope.loggedin) {
					userService.getown(this);
				}
			}, h.sF(function (user) {
				user.getName(this);
			}), h.sF(function (name) {
				$scope.username = name;
			}));
		});

		$scope.cssClass = "registerView";

		$scope.logout = function () {
			sessionHelper.logout();
		};
	}

	rootController.$inject = ["$scope", "ssn.sessionService", "ssn.sessionHelper", "ssn.userService"];

	return rootController;
});