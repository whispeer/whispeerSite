define(["whispeerHelper", "step", "asset/state"], function (h, step, State) {
	"use strict";

	function recoveryController($scope, $rootScope, $routeParams, socketService, keyStore, sessionService, userService, cssService, errorService) {
		cssService.setClass("recoveryView");

		$scope.codeProvided = $routeParams.recoveryCode;

		$scope.qr = {
			enabled: $scope.codeProvided
		};

		var savePasswordState = new State();
		$scope.savePasswordState = savePasswordState.data;

		$scope.changePassword = {
			password: "",
			password2: "",
			enabled: sessionService.isLoggedin()
		};

		$scope.savePassword = function () {
			savePasswordState.pending();

			step(function () {
				userService.getown().changePassword($scope.changePassword.password, this);
			}, errorService.failOnError(savePasswordState));
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
				$scope.changePassword = true;
				$rootScope.$broadcast("ssn.recovery");
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

	recoveryController.$inject = ["$scope", "$rootScope", "$routeParams", "ssn.socketService", "ssn.keyStoreService", "ssn.sessionService", "ssn.userService", "ssn.cssService", "ssn.errorService"];

	return recoveryController;
});