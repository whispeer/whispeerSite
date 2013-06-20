/**
* mainController
**/

define(['step'], function (step) {
	'use strict';

	function mainController($scope, $rootScope) {
		$scope.$parent.cssClass = "mainView";
	}

	mainController.$inject = ['$scope', '$rootScope'];

	return mainController;
});