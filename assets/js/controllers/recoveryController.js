define(["whispeerHelper", "step", "asset/state", "libs/qrreader"], function (h, step, State, qrreader) {
	"use strict";

	function recoveryController($scope, $rootScope, $routeParams, socketService, keyStore, sessionService, userService, cssService, errorService) {
		cssService.setClass("recoveryView");

		$scope.codeProvided = $routeParams.recoveryCode;

		$scope.qr = {
			enabled: $scope.codeProvided
		};

		var savePasswordState = new State();
		$scope.savePasswordState = savePasswordState.data;

		var loadBackupKeyState = new State();
		$scope.loadBackupKeyState = loadBackupKeyState.data;

		$scope.pwValidationOptions = {
			validateOnCallback: true,
			hideOnInteraction: true
		};

		$scope.changePassword = {
			password: "",
			enabled: sessionService.isLoggedin()
		};

		$scope.savePassword = function () {
			savePasswordState.pending();

			if ($scope.pwValidationOptions.checkValidations()) {
				savePasswordState.failed();
				return;
			}

			step(function () {
				userService.getown().changePassword($scope.changePassword.password, this);
			}, h.sF(function () {
				window.location.href = "/";
			}), errorService.failOnError(savePasswordState));
		};

		function doRecovery(key, cb) {
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
				this.ne();
			}), cb);
		}

		$scope.fileUpload = function (e) {
			step(function () {
				var file = e.target.files[0];
				if (!file.type.match(/image.*/i)) {
					return;
				}

				qrreader.decode(h.toUrl(file), this);
			}, function (code) {
				doRecovery(code, errorService.criticalError);
			});
		};

		$scope.loadBackupKeyManual = function () {
			loadBackupKeyState.pending();

			doRecovery($scope.manualCode, errorService.failOnError(loadBackupKeyState));
		};

		$scope.backupKeyCallback = function (key) {
			step(function () {
				doRecovery(key, this);
			}, function (e) {
				if (e) {
					$scope.qr.reset();
				}
				this(e);
			}, errorService.criticalError);
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