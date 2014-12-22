define([], function () {
	"use strict";

	function recoveryController($scope, $http, cssService) {
		cssService.setClass("versionView");
	}

	recoveryController.$inject = ["$scope", "$http", "ssn.cssService"];

	return recoveryController;
});