/**
* userController
**/

define(['step'], function (step) {
	'use strict';

	function userController($scope, $rootScope) {
		$scope.$parent.cssClass = "profileView";
	}

	userController.$inject = ['$scope', '$rootScope'];

	return userController;
});