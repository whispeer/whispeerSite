define([], function () {
	"use strict";

	function impressumController(cssService) {
		cssService.setClass("versionView");
	}

	impressumController.$inject = ["ssn.cssService"];

	return impressumController;
});