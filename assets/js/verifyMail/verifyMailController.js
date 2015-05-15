define(["whispeerHelper", "step", "asset/state", "verifyMail/verifyMailModule", "services/socketService", "services/errorService"], function (h, step, SuccessState, controllerModule) {
	"use strict";

	function verifyMailController($scope, socketService, errorService) {
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
			}), errorService.failOnError(verifying));
		};
	}

	verifyMailController.$inject = ["$scope", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.verifyMailController", verifyMailController);
});
