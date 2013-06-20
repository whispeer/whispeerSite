/**
* sessionController
**/

define(['step'], function (step) {
	'use strict';

	function sessionController($scope, sessionService, styleService) {
		$scope.loggedin = false;

		$scope.$on('ssn.login', function () {
			$scope.loggedin = sessionService.isLoggedin();
		});

		$scope.$on('ssn.cssClass', function () {
			$scope.cssClass = styleService.cssClass();
		});

		$scope.cssClass = "registerView";

		$scope.logout = function () {
			sessionService.logout();
		};
	}

	sessionController.$inject = ['$scope', 'ssn.sessionService'];

	return sessionController;
});