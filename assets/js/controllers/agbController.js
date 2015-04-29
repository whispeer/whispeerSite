define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function agbController($scope, cssService) {
		cssService.setClass("versionView");
	}

	agbController.$inject = ["$scope", "ssn.cssService"];

	controllerModule.controller("ssn.agbController", agbController);
});
