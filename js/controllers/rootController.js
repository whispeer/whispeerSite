/**
* sessionController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function rootController($scope, sessionService, sessionHelper, userService, cssService) {
		$scope.loggedin = false;
		$scope.username = "";

		$scope.$on("ssn.login", function () {
			$scope.loggedin = sessionService.isLoggedin();
		});

		$scope.$on("ssn.ownLoaded", function () {
			step(function () {
				if ($scope.loggedin) {
					var user = userService.getown();
					$scope.userid = user.getID();
					user.getName(this);
				}
			}, h.sF(function (name) {
				$scope.username = name;
			}));
		});

		cssService.addListener(function (newClass) {
			$scope.cssClass = newClass;
		});

		$scope.cssClass = cssService.getClass();

		$scope.logout = function () {
			sessionHelper.logout();
		};
	}

	rootController.$inject = ["$scope", "ssn.sessionService", "ssn.sessionHelper", "ssn.userService", "ssn.cssService"];

	return rootController;
});