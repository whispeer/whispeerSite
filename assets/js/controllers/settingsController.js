/**
* friendsController
**/

define(["whispeerHelper", "step", "asset/state", "libs/qr"], function (h, step, State, qr) {
	"use strict";

	function settingsController($scope, $timeout, errorService, cssService, settingsService, userService, localize) {
		cssService.setClass("settingsView");

		var saveSafetyState = new State();
		$scope.saveSafetyState = saveSafetyState.data;

		var resetSafetyState = new State();
		$scope.resetSafetyState = resetSafetyState.data;

		var saveNameState = new State();
		$scope.saveNameState = saveNameState.data;

		var saveGeneralState = new State();
		$scope.saveGeneralState = saveGeneralState.data;

		$scope.safetySorted = ["birthday", "location", "relationship", "education", "work", "gender", "languages"];
		$scope.languages = ["de", "en-US"];

		step(function () {
			this.parallel.unflatten();

			settingsService.getBranch("privacy", this.parallel());
			settingsService.getBranch("sound", this.parallel());
			settingsService.getBranch("messages", this.parallel());
			settingsService.getBranch("uiLanguage", this.parallel());
			userService.getown().loadBasicData(this.parallel());
		}, h.sF(function (privacy, sound, messages, uiLanguage) {
			$scope.safety = h.deepCopyObj(privacy, 4);

			$scope.notificationSound = "on";
			$scope.sendShortCut = "enter";

			$scope.uiLanguage = localize.getLanguage();

			if (sound) {
				$scope.notificationSound = (sound.active ? "on" : "off");
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
			$scope.fingerprint = userService.getown().data.fingerprint;

			qr.image({
				image: document.getElementById("fingerPrintQR"),
				value: $scope.fingerprint,
				size: 7,
				level: "L"
			});
		}), errorService.criticalError);

		$scope.saveGeneral = function () {
			saveGeneralState.pending();

			step(function () {
				this.parallel.unflatten();

				settingsService.getBranch("sound", this.parallel());
				settingsService.getBranch("messages", this.parallel());
				settingsService.getBranch("uiLanguage", this.parallel());
			}, h.sF(function (sound, messages, uiLanguage) {
				sound = sound || {};
				messages = messages || {};
				uiLanguage = uiLanguage || {};

				sound.active = ($scope.notificationSound === "on" ? true : false);
				messages.sendShortCut = $scope.sendShortCut;

				uiLanguage.data = $scope.uiLanguage;
				localize.setLanguage($scope.uiLanguage);

				settingsService.updateBranch("sound", sound, this.parallel());
				settingsService.updateBranch("messages", messages, this.parallel());
				settingsService.updateBranch("uiLanguage", uiLanguage, this.parallel());
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), errorService.failOnError(saveGeneralState));

		};

		$scope.saveSafety = function () {
			saveSafetyState.pending();
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				userService.getown().rebuildProfilesForSettings($scope.safety, branch, this);
			}), h.sF(function () {
				settingsService.updateBranch("privacy", $scope.safety, this);
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), errorService.failOnError(saveSafetyState));
		};

		$scope.resetSafety = function () {
			resetSafetyState.pending();
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				$scope.safety = h.deepCopyObj(branch, 4);
				$scope.$broadcast("reloadInitialSelection");

				this.ne();
			}), errorService.failOnError(resetSafetyState));
		};

		$scope.mail = userService.getown().getMail();

		$scope.saveName = function () {
			saveNameState.pending();

			var me = userService.getown();
			step(function () {
				me.setProfileAttribute("basic.firstname", $scope.firstName, this.parallel());
				me.setProfileAttribute("basic.lastname", $scope.lastName, this.parallel());
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

		};

		$scope.savePassword = function () {
			//The easy version at first!
			//TODO: improve for more reliability against server.
		};
	}

	settingsController.$inject = ["$scope", "$timeout", "ssn.errorService", "ssn.cssService", "ssn.settingsService", "ssn.userService", "localize"];

	return settingsController;
});