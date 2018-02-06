"use strict";

import * as Bluebird from "bluebird"

import h from "../helper/helper"
import State from "../asset/state"
import Cache from "../services/Cache"
import errorService from "../services/error.service"
import keyStore from "../services/keyStore.service"
import sessionService from "../services/session.service"
import socketService from "../services/socket.service"
import userService from "../users/userService"

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

	function doRecovery(key) {
		return Bluebird.try(function () {
			keyStore.setKeyGenIdentifier(nick);
			var keyID = keyStore.sym.loadBackupKey(keyStore.format.unBase32(key));
			keyStore.setKeyGenIdentifier("");

			return socketService.emit("recovery.useRecoveryCode", {
				code: recoveryCode,
				keyFingerPrint: keyID
			});
		}).then(function (response) {
			sessionService.setLoginData(response.sid, response.userid);
			$scope.changePassword.enabled = true;
		})
	}

	$scope.fileUpload = function (e) {
		var file = e.target.files[0];

		if (!file.type.match(/image.*/i)) {
			return;
		}


		return import("../libs/qrreader")
			.then((qrreader) => new Bluebird((resolve) => qrreader.decode(h.toUrl(file), resolve)))
			.then((code) => doRecovery(code).catch(errorService.criticalError))
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

	var requestState = new State();
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

controllerModule.controller("ssn.recoveryController", ["$scope", recoveryController]);
