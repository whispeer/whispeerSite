/**
* friendsController
**/

define(["whispeerHelper", "step"], function (h, step) {
	"use strict";

	function settingsController($scope, cssService, settingsService) {
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

		function getAllProfileTypes(privacySettings) {
			var i, profileTypes = [];
			for (i = 0; i < $scope.safetySorted.length; i += 1) {
				var cur = privacySettings[$scope.safetySorted[i]];
				if (cur.encrypt) {
					profileTypes = profileTypes.concat(cur.visibility);
				}
			}

			if (privacySettings.basic.firstname.encrypt) {
				profileTypes = profileTypes.concat(privacySettings.basic.firstname.visibility);
			}

			if (privacySettings.basic.lastname.encrypt) {
				profileTypes = profileTypes.concat(privacySettings.basic.lastname.visibility);
			}

			return h.arrayUnique(profileTypes);
		}

		$scope.saveSafety = function () {
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (branch) {
				var typesOld = getAllProfileTypes(branch);
				var typesNew = getAllProfileTypes($scope.safety);

				var profilesToAdd = h.arraySubtract(typesNew, typesOld);
				var profilesToRemove = h.arraySubtract(typesOld, typesNew);

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

		$scope.saveName = function () {

		};

		$scope.checkNickName = function () {

		};

		$scope.changeNickName = function () {

		};

		$scope.saveMail = function () {

		};

		$scope.savePassword = function () {
			//The easy version at first!
			//TODO: improve for more reliability against server.
		};
	}

	settingsController.$inject = ["$scope", "ssn.cssService", "ssn.settingsService"];

	return settingsController;
});