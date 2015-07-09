/**
* setupController
**/

define(["step", "whispeerHelper", "controllers/controllerModule"], function (step, h, controllerModule) {
	"use strict";

	function patronizeThankYouController($scope, cssService, socketService, errorService) {
		cssService.setClass("patronizeView");

		socketService.emit("user.donated", {}, errorService.criticalError);
	}

	patronizeThankYouController.$inject = ["$scope", "ssn.cssService", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.patronizeThankYouController", patronizeThankYouController);
});
