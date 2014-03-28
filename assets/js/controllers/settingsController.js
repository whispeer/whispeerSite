/**
* friendsController
**/

define(["whispeerHelper", "step"], function (h, step) {
	"use strict";

	function settingsController($scope, cssService, settingsService, userService) {
		cssService.setClass("settingsView");

		$scope.safetySorted = ["location", "birthday", "relationship", "education", "work", "gender", "languages"];

		step(function () {
			settingsService.getBranch("privacy", this);
		}, h.sF(function (branch) {
			$scope.safety = h.deepCopyObj(branch, 4);
		}), function (e) {
			console.log(e);
			//TODO: general error log.
		});

		$scope.saveSafety = function () {
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				userService.getown().rebuildProfilesForSettings($scope.safety, branch, this);
			}), h.sF(function () {
				settingsService.updateBranch("privacy", $scope.safety, this);
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
				//refactor profiles:
				//one general profile (master profile)
				//one for every circle and general
				//on update: general profile update -> other profiles update depending on settings
				//own user: only load general profile
			}), function () {
				debugger;
			});
		};

		$scope.resetSafety = function () {
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				$scope.safety = h.deepCopyObj(branch, 4);
				$scope.$broadcast("reloadInitialSelection");
			}), function (e) {
				console.log(e);
				//TODO: general error log.
			});
		};

		var names = userService.getown().data.names;
		$scope.firstName = names.firstname;
		$scope.lastName = names.lastname;
		$scope.nickName = names.nickname;
		$scope.mail = userService.getown().getMail();

		$scope.saveName = function () {
			var me = userService.getown()
			step(function () {
				me.setProfileAttribute("basic.firstname", $scope.firstName, this.parallel());
				me.setProfileAttribute("basic.lastname", $scope.lastName, this.parallel());
			}, h.sF(function () {
				me.uploadChangedProfile(this);
			}), function (e) {
				if (e) {
					console.error(e);
				}
			});
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

	settingsController.$inject = ["$scope", "ssn.cssService", "ssn.settingsService", "ssn.userService"];

	return settingsController;
});