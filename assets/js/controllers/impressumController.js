define([], function () {
	"use strict";

	function impressumController(cssService) {
		cssService.setClass("impressumView");
	}

	impressumController.$inject = ["ssn.cssService"];

	return impressumController;
});