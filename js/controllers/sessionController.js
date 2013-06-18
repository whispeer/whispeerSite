/**
* sessionController
**/

define(['step'], function (step) {
	'use strict';

	function sessionController($scope) {
		$scope.loggedin = false;
	}

	sessionController.$inject = ['$scope'];

	return sessionController;
});