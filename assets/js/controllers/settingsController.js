/**
* friendsController
**/

define(["whispeerHelper", "step", "asset/state", "libs/qr", "controllers/controllerModule"], function (h, step, State, qr, controllerModule) {
	"use strict";

	function settingsController($scope, $timeout, errorService, cssService, sessionHelper, settingsService, userService, filterService, localize) {
		cssService.setClass("settingsView", true);

		var saveSafetyState = new State();
		$scope.saveSafetyState = saveSafetyState.data;

		var resetSafetyState = new State();
		$scope.resetSafetyState = resetSafetyState.data;

		var saveNameState = new State();
		$scope.saveNameState = saveNameState.data;

		var saveMailState = new State();
		$scope.saveMailState = saveMailState.data;

		var savePasswordState = new State();
		$scope.savePasswordState = savePasswordState.data;

		var saveGeneralState = new State();
		$scope.saveGeneralState = saveGeneralState.data;

		$scope.safetySorted = ["birthday", "location", "relationship", "education", "work", "gender", "languages"];
		$scope.languages = ["de", "en"];

		$scope.pwState = { password: "" };
		$scope.pwValidationOptions = {
			validateOnCallback: true,
			hideOnInteraction: true
		};

		$scope.getFiltersByID = filterService.getFiltersByID;

		step(function () {
			userService.getown().loadBasicData(this);
		}, h.sF(function () {

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
		}), errorService.criticalError);

		$scope.saveGeneral = function () {
			saveGeneralState.pending();

			step(function () {
				var sound = settingsService.getBranch("sound");
				var messages = settingsService.getBranch("messages");

				sound.enabled = ($scope.notificationSound === "on" ? true : false);
				messages.sendShortCut = $scope.sendShortCut;

				localize.setLanguage($scope.uiLanguage);

				settingsService.updateBranch("sound", sound);
				settingsService.updateBranch("messages", messages);
				settingsService.updateBranch("uiLanguage", $scope.uiLanguage);
				settingsService.uploadChangedData(this);
			}, errorService.failOnError(saveGeneralState));

		};

		$scope.saveSafety = function () {
			saveSafetyState.pending();
			step(function () {
				settingsService.updateBranch("privacy", $scope.safety);
				settingsService.uploadChangedData(this);
			}, h.sF(function () {
				userService.getown().uploadChangedProfile(this);
			}), errorService.failOnError(saveSafetyState));
		};

		$scope.resetSafety = function () {
			resetSafetyState.pending();
			step(function () {
				var branch = settingsService.getBranch("privacy");
				$scope.safety = h.deepCopyObj(branch, 4);
				$scope.$broadcast("reloadInitialSelection");

				this.ne();
			}, errorService.failOnError(resetSafetyState));
		};

		$scope.mail = userService.getown().getMail();

		$scope.saveName = function () {
			saveNameState.pending();

			var me = userService.getown();
			step(function () {
				me.setProfileAttribute("basic", {
					firstname: $scope.firstName,
					lastname: $scope.lastName
				}, this.parallel());
			}, h.sF(function () {
				me.uploadChangedProfile(this);
			}), h.sF(function () {
				$timeout(this);
			}), errorService.failOnError(saveNameState));
		};

		$scope.checkNickName = function () {

		};

		$scope.saveNickName = function () {

		};

		$scope.checkMail = function () {

		};

		$scope.saveMail = function () {
			saveMailState.pending();

			step(function () {
				userService.getown().setMail($scope.mail, this);
			}, errorService.failOnError(saveMailState));
		};

		$scope.savePassword = function () {
			savePasswordState.pending();

			if ($scope.pwValidationOptions.checkValidations()) {
				savePasswordState.failed();
				return;
			}

			step(function () {
				userService.getown().changePassword($scope.pwState.password, this);
			}, errorService.failOnError(savePasswordState));
			//The easy version at first!
			//TODO: improve for more reliability against server.
		};
	}

	settingsController.$inject = ["$scope", "$timeout", "ssn.errorService", "ssn.cssService", "ssn.sessionHelper", "ssn.settingsService", "ssn.userService", "ssn.filterService", "localize"];

	controllerModule.controller("ssn.settingsController", settingsController);
});
