/**
* userController
**/

define(['step'], function (step) {
	'use strict';

	function userController($scope, sessionService) {
		if (sessionService.loginRequired()) {
			$scope.$parent.cssClass = "profileView";
		}
	}

	userController.$inject = ['$scope', 'ssn.sessionService'];

	return userController;
});