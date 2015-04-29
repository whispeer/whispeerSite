define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function privacyPolicyController($scope, cssService) {
		cssService.setClass("versionView");
	}

	privacyPolicyController.$inject = ["$scope", "ssn.cssService"];

	controllerModule.controller("ssn.privacyPolicyController", privacyPolicyController);
});
