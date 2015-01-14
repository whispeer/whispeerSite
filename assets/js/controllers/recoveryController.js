define(["whispeerHelper", "step", "asset/state"], function (h, step, State) {
	"use strict";

	function recoveryController($scope, $routeParams, socketService, keyStore, cssService, errorService) {
		cssService.setClass("recoveryView");

		$scope.codeProvided = $routeParams.recoveryCode;

		$scope.qr = {
			enabled: $scope.codeProvided
		};

		$scope.backupKeyCallback = function (key) {
			step(function () {
				keyStore.setKeyGenIdentifier($routeParams.nick);
				var keyID = keyStore.sym.loadBackupKey(keyStore.format.unBase32(key));
				keyStore.setKeyGenIdentifier("");
				socketService.emit("recovery.useRecoveryCode", {
					code: $routeParams.recoveryCode,
					keyFingerPrint: keyID
				}, this);
			}, h.sF(function () {

			}), errorService.criticalError);
		};

		var requestState = new State();
		$scope.request = {
			identifier: "",
			state: requestState.data,
			execute: function (identifier) {
				requestState.pending();

				step(function () {
					socketService.emit("recovery.request", { identifier: identifier }, this);
				}, errorService.failOnError(requestState));
			}
		};
	}

	recoveryController.$inject = ["$scope", "$routeParams", "ssn.socketService", "ssn.keyStoreService", "ssn.cssService", "ssn.errorService"];

	return recoveryController;
});