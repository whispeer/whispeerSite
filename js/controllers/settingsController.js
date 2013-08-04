/**
* friendsController
**/

define(['step'], function (step) {
	'use strict';

	function settingsController($scope) {
		$scope.$parent.cssClass = "settingsView";
	}

	settingsController.$inject = ['$scope'];

	return settingsController;
});