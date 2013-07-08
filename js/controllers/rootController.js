/**
* sessionController
**/

define(['step'], function (step) {
	'use strict';

	function sessionController($scope, sessionService, sessionHelper, styleService) {
		$scope.loggedin = false;

		$scope.$on('ssn.login', function () {
			$scope.loggedin = sessionService.isLoggedin();
		});

		$scope.$on('ssn.cssClass', function () {
			$scope.cssClass = styleService.cssClass();
		});

		$scope.cssClass = "registerView";

		$scope.logout = function () {
			sessionHelper.logout();
		};
	}

	sessionController.$inject = ['$scope', 'ssn.sessionService', 'ssn.sessionHelper'];

	return sessionController;
});