define([
		"whispeerHelper",
		"step",
		"asset/state",
		"recovery/recoveryModule",

		"models/user",

		"services/socketService",
		"services/keyStoreService",
		"services/sessionService",
		"user/userService",
		"services/errorService",

		//sub dependencies.
		"services/locationService",
		"services/storageService",
		"services/blobService",
		"services/cacheService",
		"services/profileService",
		"services/settingsService",
		"services/initService",
		"services/migrationService",
		"services/friendsService",

		"services/trustService"
	], function (h, step, State, controllerModule) {
	"use strict";

	function recoveryController($scope, socketService, keyStore, sessionService, trustService, userService, errorService, Cache) {
		var parts = window.location.pathname.split("/");
		var nick, recoveryCode;

		Cache.disable();

		parts = parts.filter(function (v) {
			return v !== "";
		});

		if (parts.length >= 3) {
			recoveryCode = parts.pop();
			nick = parts.pop();
			$scope.codeProvided = true;
		}

		$scope.manual = {
			code: ""
		};

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
			enabled: false
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
				if (window.indexedDB) {
					window.indexedDB.deleteDatabase("whispeerCache");
				}
				sessionService.saveSession();
				window.location.href = "/main";
			}), errorService.failOnError(savePasswordState));
		};

		function doRecovery(key, cb) {
			step(function () {
				keyStore.setKeyGenIdentifier(nick);
				var keyID = keyStore.sym.loadBackupKey(keyStore.format.unBase32(key));
				keyStore.setKeyGenIdentifier("");
				socketService.emit("recovery.useRecoveryCode", {
					code: recoveryCode,
					keyFingerPrint: keyID
				}, this);
			}, h.sF(function (response) {
				sessionService.setLoginData(response.sid, response.userid, true);
				$scope.changePassword.enabled = true;

				this.ne();
			}), cb);
		}

		$scope.fileUpload = function (e) {
			var file = e.target.files[0];

			if (!file.type.match(/image.*/i)) {
				return;
			}

			step(function () {
				require.ensure(["libs/qrreader"], this);
			}, function (require) {
				var qrreader = require("libs/qrreader");
				qrreader.decode(h.toUrl(file), this);
			}, function (code) {
				doRecovery(code, errorService.criticalError);
			});
		};

		$scope.loadBackupKeyManual = function () {
			loadBackupKeyState.pending();

			doRecovery($scope.manual.code, errorService.failOnError(loadBackupKeyState));
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

	recoveryController.$inject = ["$scope", "ssn.socketService", "ssn.keyStoreService", "ssn.sessionService", "ssn.trustService", "ssn.userService", "ssn.errorService", "ssn.cacheService"];

	controllerModule.controller("ssn.recoveryController", recoveryController);
});
