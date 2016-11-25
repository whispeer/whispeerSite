/**
* setupController
**/

define(["whispeerHelper", "controllers/controllerModule"], function (h, controllerModule) {
	"use strict";

	function fundThankYouController($scope, cssService, socketService, errorService) {
		cssService.setClass("fundView");

		socketService.emit("user.donated", {}, errorService.criticalError);
	}

	fundThankYouController.$inject = ["$scope", "ssn.cssService", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.fundThankYouController", fundThankYouController);
});
