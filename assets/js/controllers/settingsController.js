/**
* friendsController
**/

define(["whispeerHelper", "step"], function (h, step) {
	"use strict";

	function settingsController($scope, errorService, cssService, settingsService, userService) {
		cssService.setClass("settingsView");

		$scope.safetySorted = ["birthday", "location", "relationship", "education", "work", "gender", "languages"];

		step(function () {
			this.parallel.unflatten();

			settingsService.getBranch("privacy", this.parallel());
			settingsService.getBranch("sound", this.parallel());
			settingsService.getBranch("messages", this.parallel());
		}, h.sF(function (privacy, sound, messages) {
			$scope.safety = h.deepCopyObj(privacy, 4);

			$scope.notificationSound = "on";
			$scope.sendShortCut = "enter";

			if (sound) {
				$scope.notificationSound = (sound.active ? 'on' : 'off');
			}
			if (messages) {
				$scope.sendShortCut = messages.sendShortCut || "enter";
			}
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
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				userService.getown().rebuildProfilesForSettings($scope.safety, branch, this);
			}), h.sF(function () {
				settingsService.updateBranch("privacy", $scope.safety, this);
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), errorService.criticalError);
		};

		$scope.resetSafety = function () {
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				$scope.safety = h.deepCopyObj(branch, 4);
				$scope.$broadcast("reloadInitialSelection");
			}), errorService.criticalError);
		};

		var names = userService.getown().data.names || {};
		$scope.firstName = names.firstname;
		$scope.lastName = names.lastname;
		$scope.nickName = names.nickname;
		$scope.mail = userService.getown().getMail();

		$scope.saveName = function () {
			var me = userService.getown();
			step(function () {
				me.setProfileAttribute("basic.firstname", $scope.firstName, this.parallel());
				me.setProfileAttribute("basic.lastname", $scope.lastName, this.parallel());
			}, h.sF(function () {
				me.uploadChangedProfile(this);
			}), errorService.criticalError);
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