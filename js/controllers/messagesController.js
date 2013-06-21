/**
* messagesController
**/

define(['step'], function (step) {
	'use strict';

	function messagesController($scope, sessionService) {
		if (sessionService.loginRequired()) {
			$scope.$parent.cssClass = "messagesView";
		}
	}

	messagesController.$inject = ['$scope', 'ssn.sessionService'];

	return messagesController;
});