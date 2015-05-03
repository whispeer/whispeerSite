define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function impressumController(cssService) {
		cssService.setClass("versionView");
	}

	impressumController.$inject = ["ssn.cssService"];

	controllerModule.controller("ssn.impressumController", impressumController);
});
