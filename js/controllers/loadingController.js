/**
* loadingController
**/

define([], function () {
	"use strict";

	function loadingController(cssService) {
		cssService.setClass("mainView");
	}

	loadingController.$inject = ["ssn.cssService"];

	return loadingController;
});