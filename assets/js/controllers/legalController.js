/**
* friendsController
**/

define(["controllers/controllerModule"], function (controllerModule) {
	"use strict";

	function legalController($scope, cssService) {
		cssService.setClass("legalView", true);
	}

	legalController.$inject = ["$scope", "ssn.cssService"];

	controllerModule.controller("ssn.legalController", legalController);
});
