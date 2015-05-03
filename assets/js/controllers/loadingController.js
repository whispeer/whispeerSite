/**
* loadingController
**/

define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function loadingController(cssService) {
		cssService.setClass("mainView loading");
	}

	loadingController.$inject = ["ssn.cssService"];

	controllerModule.controller("ssn.loadingController", loadingController);
});
