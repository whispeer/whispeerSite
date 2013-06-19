/**
* sessionController
**/

define(['step'], function (step) {
	'use strict';

	function sessionController($scope) {
		$scope.loggedin = false;
		$scope.cssClass = "registerView";
	}

	sessionController.$inject = ['$scope'];

	return sessionController;
});