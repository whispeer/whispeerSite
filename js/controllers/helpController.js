/**
* friendsController
**/

define(['step'], function (step) {
	'use strict';

	function helpController($scope) {
		$scope.$parent.cssClass = "helpView";
	}

	helpController.$inject = ['$scope'];

	return helpController;
});