define(["whispeerHelper", "step", "asset/state", "controllers/controllerModule"], function (h, step, SuccessState, controllerModule) {
	"use strict";

	function mailController($scope, $stateParams, socketService, cssService) {
		cssService.setClass("mailView");

		$scope.mails = true;

		var verifying = new SuccessState();
		$scope.verifying = verifying;

		$scope.verify = function (mailsEnabled) {
			verifying.reset();
			verifying.pending();

			step(function () {
				socketService.emit("verifyMail", {
					challenge: $stateParams.challenge,
					mailsEnabled: mailsEnabled
				}, this);
			}, h.sF(function (data) {
				if (data.mailVerified) {
					verifying.success();
				} else {
					$scope.verifying.failed();
				}
			}));
		};
	}

	mailController.$inject = ["$scope", "$stateParams", "ssn.socketService", "ssn.cssService"];

	controllerModule.controller("ssn.mailController", mailController);
});
