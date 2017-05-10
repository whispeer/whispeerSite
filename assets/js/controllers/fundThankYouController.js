/**
* setupController
**/

var cssService = require("services/css.service").default;
var errorService = require("services/error.service").errorServiceInstance;
var socketService = require("services/socket.service").default;

define(["whispeerHelper", "controllers/controllerModule"], function (h, controllerModule) {
	"use strict";

	function fundThankYouController() {
		cssService.setClass("fundView");

		socketService.emit("user.donated", {}, errorService.criticalError);
	}

	fundThankYouController.$inject = [];

	controllerModule.controller("ssn.fundThankYouController", fundThankYouController);
});
