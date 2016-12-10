/**
* friendsController
**/

define(["whispeerHelper", "bluebird", "asset/state", "libs/qr", "controllers/controllerModule"], function (h, Bluebird, State, qr, controllerModule) {
	"use strict";

	function settingsController($scope, $timeout, errorService, cssService, sessionHelper, settingsService, userService, filterService, localize) {
		cssService.setClass("settingsView", true);

		var saveSafetyState = new State.default();
		$scope.saveSafetyState = saveSafetyState.data;

		var resetSafetyState = new State.default();
		$scope.resetSafetyState = resetSafetyState.data;

		var saveNameState = new State.default();
		$scope.saveNameState = saveNameState.data;

		var saveMailState = new State.default();
		$scope.saveMailState = saveMailState.data;

		var savePasswordState = new State.default();
		$scope.savePasswordState = savePasswordState.data;

		var saveGeneralState = new State.default();
		$scope.saveGeneralState = saveGeneralState.data;

		$scope.safetySorted = ["birthday", "location", "relationship", "education", "work", "gender", "languages"];
		$scope.languages = ["de", "en"];

		$scope.pwState = { password: "" };
		$scope.pwValidationOptions = {
			validateOnCallback: true,
			hideOnInteraction: true
		};

		$scope.getFiltersByID = filterService.getFiltersByID;

		userService.getown().loadBasicData()
		.then(function () {
			var privacy = settingsService.getBranch("privacy");
			var sound = settingsService.getBranch("sound");
			var messages = settingsService.getBranch("messages");
			var uiLanguage = settingsService.getBranch("uiLanguage");

			$scope.safety = h.deepCopyObj(privacy, 4);

			$scope.notificationSound = "on";
			$scope.sendShortCut = "enter";

			$scope.uiLanguage = localize.getLanguage();

			if (sound) {
				$scope.notificationSound = (sound.enabled ? "on" : "off");
			}
			if (messages) {
				$scope.sendShortCut = messages.sendShortCut || "enter";
			}
			if (uiLanguage && uiLanguage.data) {
				$scope.uiLanguage = uiLanguage.data;
			}

			$scope.mails = {
				available: typeof settingsService.getBranch("mailsEnabled") !== "undefined",
				enabled: (settingsService.getBranch("mailsEnabled") ? "true": "false")
			};

			var names = userService.getown().data.names || {};
			$scope.firstName = names.firstname;
			$scope.lastName = names.lastname;
			$scope.nickName = names.nickname;
			var fp = userService.getown().data.fingerprint;
			$scope.fingerprint = [fp.substr(0,13), fp.substr(13,13), fp.substr(26,13), fp.substr(39,13)];

			qr.image({
				image: document.getElementById("fingerPrintQR"),
				value: fp,
				size: 7,
				level: "L"
			});
		}).catch(
			errorService.criticalError
		);

		$scope.saveGeneral = function () {
			saveGeneralState.pending();

			var savePromise = Bluebird.try(function () {
				var sound = settingsService.getBranch("sound");
				var messages = settingsService.getBranch("messages");

				sound.enabled = ($scope.notificationSound === "on" ? true : false);
				var mailsEnabled = ($scope.mails.enabled === "true" ? true : false);
				messages.sendShortCut = $scope.sendShortCut;

				localize.setLanguage($scope.uiLanguage);

				settingsService.updateBranch("sound", sound);
				settingsService.updateBranch("messages", messages);
				settingsService.updateBranch("mailsEnabled", mailsEnabled);
				settingsService.updateBranch("uiLanguage", $scope.uiLanguage);

				return settingsService.uploadChangedData();
			});

			errorService.failOnErrorPromise(saveGeneralState, savePromise);
		};

		$scope.saveSafety = function () {
			saveSafetyState.pending();

			var savePromise = Bluebird.try(function () {
				settingsService.updateBranch("privacy", $scope.safety);
				return settingsService.uploadChangedData();
			}).then(function () {
				return userService.getown().uploadChangedProfile();
			});

			errorService.failOnErrorPromise(saveSafetyState, savePromise);
		};

		$scope.resetSafety = function () {
			resetSafetyState.pending();

			var resetPromise = Bluebird.try(function () {
				var branch = settingsService.getBranch("privacy");
				$scope.safety = h.deepCopyObj(branch, 4);
				$scope.$broadcast("reloadInitialSelection");
			});

			errorService.failOnErrorPromise(resetSafetyState, resetPromise);
		};

		$scope.mail = userService.getown().getMail();

		$scope.saveName = function () {
			saveNameState.pending();

			var me = userService.getown();

			var savePromise = me.setProfileAttribute("basic", {
				firstname: $scope.firstName,
				lastname: $scope.lastName
			}).then(function () {
				return me.uploadChangedProfile();
			}).then(function () {
				return $timeout();
			});

			errorService.failOnErrorPromise(saveNameState, savePromise);
		};

		$scope.checkNickName = function () {

		};

		$scope.saveNickName = function () {

		};

		$scope.checkMail = function () {

		};

		$scope.saveMail = function () {
			saveMailState.pending();

			var savePromise = userService.getown().setMail($scope.mail);

			errorService.failOnErrorPromise(saveMailState, savePromise);
		};

		$scope.savePassword = function () {
			savePasswordState.pending();

			if ($scope.pwValidationOptions.checkValidations()) {
				savePasswordState.failed();
				return;
			}

			var savePromise = userService.getown().changePassword($scope.pwState.password);

			errorService.failOnErrorPromise(savePasswordState, savePromise);

			//The easy version at first!
			//TODO: improve for more reliability against server.
		};
	}

	settingsController.$inject = ["$scope", "$timeout", "ssn.errorService", "ssn.cssService", "ssn.sessionHelper", "ssn.settingsService", "ssn.userService", "ssn.filterService", "localize"];

	controllerModule.controller("ssn.settingsController", settingsController);
});
