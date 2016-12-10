define(["bluebird", "asset/state", "verifyMail/verifyMailModule", "services/socketService", "services/errorService"], function (Bluebird, SuccessState, controllerModule) {
	"use strict";

	function verifyMailController($scope, socketService, errorService) {
		$scope.mails = true;

		var verifying = new SuccessState.default();
		$scope.verifying = verifying;

		var parts = window.location.pathname.split("/");
		parts = parts.filter(function (v) {
			return v !== "";
		});

		$scope.challenge = "";

		if (parts.length > 2) {
			$scope.challenge = parts.pop();
		}

		$scope.verify = function (mailsEnabled) {
			verifying.reset();
			verifying.pending();

			var verifyPromise = socketService.emit("verifyMail", {
				challenge: $scope.challenge,
				mailsEnabled: mailsEnabled
			}).then(function (data) {
				if (data.mailVerified) {
					verifying.success();
				} else {
					$scope.verifying.failed();
				}
			});

			errorService.failOnErrorPromise(verifying, verifyPromise);
		};
	}

	verifyMailController.$inject = ["$scope", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.verifyMailController", verifyMailController);
});
