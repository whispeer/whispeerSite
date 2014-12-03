define([], function () {
	"use strict";

	function privacyPolicyController($scope, cssService) {
		cssService.setClass("versionView");
	}

	privacyPolicyController.$inject = ["$scope", "ssn.cssService"];

	return privacyPolicyController;
});