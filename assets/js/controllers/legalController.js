/**
* friendsController
**/

define([], function () {
	"use strict";

	function helpController($scope, cssService) {
		cssService.setClass("legalView", true);
	}

	helpController.$inject = ["$scope", "ssn.cssService"];

	return helpController;
});