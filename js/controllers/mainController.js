/**
* mainController
**/

define(['step'], function (step) {
	'use strict';

	function mainController($scope) {
		$scope.$parent.cssClass = "mainView";
	}

	mainController.$inject = ['$scope'];

	return mainController;
});