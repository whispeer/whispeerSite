/**
* friendsController
**/

define([], function () {
	"use strict";

	function helpController($scope, cssService) {
		cssService.setClass("helpView");
	}

	helpController.$inject = ["$scope", "ssn.cssService"];

	return helpController;
});