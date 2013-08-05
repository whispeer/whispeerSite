/**
* friendsController
**/

define([], function () {
	"use strict";

	function settingsController($scope, cssService) {
		cssService.setClass("settingsView");
	}

	settingsController.$inject = ["$scope", "ssn.cssService"];

	return settingsController;
});