var Cache = require("services/Cache.ts").default;
var errorService = require("services/error.service").errorServiceInstance;
var keyStore = require("services/keyStore.service").default;
var sessionService = require("services/session.service").default;
var socketService = require("services/socket.service").default;
var userService = require("users/userService").default;

"use strict";

const h = require("whispeerHelper").default;
const Bluebird = require("bluebird");
const State = require("asset/state");
const controllerModule = require("recovery/recoveryModule");

function recoveryController($scope) {
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
			return userService.getOwn().changePassword($scope.changePassword.password);
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

recoveryController.$inject = ["$scope"];

controllerModule.controller("ssn.recoveryController", recoveryController);
