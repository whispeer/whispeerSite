/**
* friendsController
**/

define([], function () {
	"use strict";

	function helpController($scope, cssService) {
		cssService.setClass("notificationCenterView");
	}

	helpController.$inject = ["$scope", "ssn.cssService"];

	return helpController;
});