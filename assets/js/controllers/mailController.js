define(["whispeerHelper", "step"], function (h, step) {
	"use strict";

	function mailController($scope, $routeParams, socketService, cssService) {
		cssService.setClass("loading");

		step(function () {
			socketService.emit("verifyMail", {
				challenge: $routeParams.challenge
			}, this);
		}, h.sF(function (data) {
			cssService.setClass("mailView");

			if (data.mailVerified) {
				$scope.verified = true;
			} else {
				$scope.verified = false;
			}
		}));
	}

	mailController.$inject = ["$scope", "$routeParams", "ssn.socketService", "ssn.cssService"];

	return mailController;
});