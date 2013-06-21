/**
* friendsController
**/

define(['step'], function (step) {
	'use strict';

	function friendsController($scope, sessionService) {
		if (sessionService.loginRequired()) {
			$scope.$parent.cssClass = "friendsView";
		}
	}

	friendsController.$inject = ['$scope', 'ssn.sessionService'];

	return friendsController;
});