/**
* friendsController
**/

define([], function () {
	"use strict";

	function helpController($scope, cssService) {
		cssService.setClass("legalView");
	}

	helpController.$inject = ["$scope", "ssn.cssService"];

	return helpController;
});