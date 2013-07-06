/**
* messagesController
**/

define(['step'], function (step) {
	'use strict';

	function messagesController($scope) {
		$scope.$parent.cssClass = "messagesView";
	}

	messagesController.$inject = ['$scope'];

	return messagesController;
});