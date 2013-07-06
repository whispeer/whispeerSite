/**
* userController
**/

define(['step'], function (step) {
	'use strict';

	function userController($scope) {
		$scope.$parent.cssClass = "profileView";
	}

	userController.$inject = ['$scope'];

	return userController;
});