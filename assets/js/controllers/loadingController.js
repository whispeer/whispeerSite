/**
* loadingController
**/

define([], function () {
	"use strict";

	function loadingController(cssService) {
		cssService.setClass("mainView loading");
	}

	loadingController.$inject = ["ssn.cssService"];

	return loadingController;
});