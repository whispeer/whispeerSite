/**
* friendsController
**/

define(["whispeerHelper", "step", "asset/state", "libs/qr"], function (h, step, State, qr) {
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
		$scope.languages = ["de", "en-US"];

		$scope.pwState = { password: "" };
		$scope.pwValidationOptions = {
			validateOnCallback: true,
			hideOnInteraction: true
		};

		$scope.getFiltersByID = filterService.getFiltersByID;

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
				this.parallel.unflatten();

				settingsService.getBranch("sound", this.parallel());
				settingsService.getBranch("messages", this.parallel());
				settingsService.getBranch("uiLanguage", this.parallel());
			}, h.sF(function (sound, messages) {
				sound.enabled = ($scope.notificationSound === "on" ? true : false);
				messages.sendShortCut = $scope.sendShortCut;

				localize.setLanguage($scope.uiLanguage);

				settingsService.updateBranch("sound", sound, this.parallel());
				settingsService.updateBranch("messages", messages, this.parallel());
				settingsService.updateBranch("uiLanguage", $scope.uiLanguage, this.parallel());
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), errorService.failOnError(saveGeneralState));

		};

		$scope.saveSafety = function () {
			saveSafetyState.pending();
			step(function () {
				settingsService.updateBranch("privacy", $scope.safety, this);
			}, h.sF(function () {
				settingsService.uploadChangedData(this);
			}), h.sF(function () {
				userService.getown().uploadChangedProfile(this);
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

	return settingsController;
});
