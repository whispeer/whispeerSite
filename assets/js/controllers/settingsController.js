/**
* friendsController
**/

define(["whispeerHelper", "step", "asset/state"], function (h, step, State) {
	"use strict";

	function settingsController($scope, errorService, cssService, settingsService, userService) {
		cssService.setClass("settingsView");

		var saveSafetyState = new State();
		$scope.saveSafetyState = saveSafetyState.data;

		var resetSafetyState = new State();
		$scope.resetSafetyState = resetSafetyState.data;

		var saveNameState = new State();
		$scope.saveNameState = saveNameState.data;

		$scope.safetySorted = ["birthday", "location", "relationship", "education", "work", "gender", "languages"];

		function failOnError(state) {
			return function (e) {
				if (e) {
					state.failed();
					errorService.criticalError(e);
				} else {
					state.success();
				}
			};
		}

		step(function () {
			this.parallel.unflatten();

			settingsService.getBranch("privacy", this.parallel());
			settingsService.getBranch("sound", this.parallel());
			settingsService.getBranch("messages", this.parallel());
			userService.getown().loadBasicData(this.parallel());
		}, h.sF(function (privacy, sound, messages) {
			$scope.safety = h.deepCopyObj(privacy, 4);

			$scope.notificationSound = "on";
			$scope.sendShortCut = "enter";

			if (sound) {
				$scope.notificationSound = (sound.active ? "on" : "off");
			}
			if (messages) {
				$scope.sendShortCut = messages.sendShortCut || "enter";
			}

			var names = userService.getown().data.names || {};
			$scope.firstName = names.firstname;
			$scope.lastName = names.lastname;
			$scope.nickName = names.nickname;
			$scope.fingerprint = userService.getown().data.fingerprint;
		}), errorService.criticalError);

		$scope.saveGeneral = function () {
			step(function () {
				this.parallel.unflatten();

				settingsService.getBranch("sound", this.parallel());
				settingsService.getBranch("messages", this.parallel());
			}, h.sF(function (sound, messages) {
				sound = sound || {};
				messages = messages || {};

				sound.active = ($scope.notificationSound === "on" ? true : false);
				messages.sendShortCut = $scope.sendShortCut;

				settingsService.updateBranch("sound", sound, this.parallel());
				settingsService.updateBranch("messages", messages, this.parallel());
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), errorService.criticalError);

		};

		$scope.saveSafety = function () {
			saveSafetyState.reset();
			saveSafetyState.pending();
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				userService.getown().rebuildProfilesForSettings($scope.safety, branch, this);
			}), h.sF(function () {
				settingsService.updateBranch("privacy", $scope.safety, this);
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), failOnError(saveSafetyState));
		};

		$scope.resetSafety = function () {
			resetSafetyState.reset();
			resetSafetyState.pending();
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				$scope.safety = h.deepCopyObj(branch, 4);
				$scope.$broadcast("reloadInitialSelection");

				this.ne();
			}), failOnError(resetSafetyState));
		};

		$scope.mail = userService.getown().getMail();

		$scope.saveName = function () {
			saveNameState.reset();
			saveNameState.pending();

			var me = userService.getown();
			step(function () {
				me.setProfileAttribute("basic.firstname", $scope.firstName, this.parallel());
				me.setProfileAttribute("basic.lastname", $scope.lastName, this.parallel());
			}, h.sF(function () {
				me.uploadChangedProfile(this);
			}), failOnError(saveNameState));
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

	settingsController.$inject = ["$scope", "ssn.errorService", "ssn.cssService", "ssn.settingsService", "ssn.userService"];

	return settingsController;
});