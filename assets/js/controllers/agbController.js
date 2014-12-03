define([], function () {
	"use strict";

	function agbController($scope, cssService) {
		cssService.setClass("versionView");
	}

	agbController.$inject = ["$scope", "ssn.cssService"];

	return agbController;
});