/**
* mainController
**/

define(['step'], function (step) {
	'use strict';

	function mainController($scope, sessionService) {
		if (sessionService.loginRequired()) {
			$scope.$parent.cssClass = "mainView";
		}
	}

	mainController.$inject = ['$scope', 'ssn.sessionService'];

	return mainController;
});