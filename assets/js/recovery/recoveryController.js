define([
		"whispeerHelper",
		"bluebird",
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
	], function (h, Bluebird, State, controllerModule) {
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

		var savePasswordState = new State.default();
		$scope.savePasswordState = savePasswordState.data;

		var loadBackupKeyState = new State.default();
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

			var savePromise = Bluebird.try(function () {
				return userService.getown().changePassword($scope.changePassword.password);
			}).then(function () {
				if (window.indexedDB) {
					window.indexedDB.deleteDatabase("whispeerCache");
				}
				sessionService.saveSession();
				window.location.href = "/main";
			});

			errorService.failOnErrorPromise(savePasswordState, savePromise);
		};

		function doRecovery(key, cb) {
			return Bluebird.try(function () {
				keyStore.setKeyGenIdentifier(nick);
				var keyID = keyStore.sym.loadBackupKey(keyStore.format.unBase32(key));
				keyStore.setKeyGenIdentifier("");

				return socketService.emit("recovery.useRecoveryCode", {
					code: recoveryCode,
					keyFingerPrint: keyID
				});
			}).then(function (response) {
				sessionService.setLoginData(response.sid, response.userid, true);
				$scope.changePassword.enabled = true;
			}).nodeify(cb);
		}

		$scope.fileUpload = function (e) {
			var file = e.target.files[0];

			if (!file.type.match(/image.*/i)) {
				return;
			}

			Bluebird.try(function () {
				return new Bluebird(function (resolve) {
					require(["libs/qrreader"], resolve);
				});
			}).then(function (qrreader) {
				return new Bluebird(function (resolve) {
					qrreader.decode(h.toUrl(file), resolve);
				});
			}).then(function (code) {
				doRecovery(code).catch(errorService.criticalError);
			});
		};

		$scope.loadBackupKeyManual = function () {
			loadBackupKeyState.pending();

			var loadPromise = doRecovery($scope.manual.code);

			errorService.failOnErrorPromise(loadBackupKeyState, loadPromise);
		};

		$scope.backupKeyCallback = function (key) {
			return doRecovery(key).then(function (e) {
				if (e) {
					$scope.qr.reset();
				}

				return e;
			}).catch(errorService.criticalError);
		};

		var requestState = new State.default();
		$scope.request = {
			identifier: "",
			state: requestState.data,
			execute: function (identifier) {
				requestState.pending();

				var requestPromise = socketService.emit("recovery.request", { identifier: identifier });
				errorService.failOnErrorPromise(requestState, requestPromise);
			}
		};
	}

	recoveryController.$inject = ["$scope", "ssn.socketService", "ssn.keyStoreService", "ssn.sessionService", "ssn.trustService", "ssn.userService", "ssn.errorService", "ssn.cacheService"];

	controllerModule.controller("ssn.recoveryController", recoveryController);
});
