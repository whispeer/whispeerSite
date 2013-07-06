/**
* friendsController
**/

define(['step'], function (step) {
	'use strict';

	function friendsController($scope) {
		$scope.$parent.cssClass = "friendsView";
	}

	friendsController.$inject = ['$scope'];

	return friendsController;
});