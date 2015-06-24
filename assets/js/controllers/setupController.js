/**
* setupController
**/

define(["step", "whispeerHelper", "asset/state", "libs/qr", "libs/filesaver", "controllers/controllerModule"], function (step, h, State, qr, saveAs, controllerModule) {
	"use strict";

	function setupController($scope, $state, cssService, errorService, userService, settingsService) {
		cssService.setClass("setupView");

		var saveSetupState = new State();
		$scope.saveSetupState = saveSetupState.data;

		$scope.profileSaved = false;
		$scope.profile = {
			privateName: false,
			firstName: "",
			lastName: "",
			mail: ""
		};

		function makeNamePrivate(cb) {
			step(function () {
				settingsService.getBranch("privacy", this);
			}, h.sF(function (safetySettings) {
				safetySettings = h.deepCopyObj(safetySettings, 4);
				safetySettings.basic = {
					firstname: {
						encrypt: true,
						visibility: ["always:allfriends"]
					},
					lastname: {
						encrypt: true,
						visibility: ["always:allfriends"]
					}
				};
				settingsService.updateBranch("privacy", safetySettings, this);
			}), h.sF(function () {
				settingsService.uploadChangedData(this);
			}), cb);
		}

		step(function () {
			var me = userService.getown();
			$scope.profile.mail = me.getMail();
			me.getName(this);
		}, h.sF(function (names) {
			$scope.profile.firstName = names.firstname;
			$scope.profile.lastName = names.lastname;
		}), errorService.criticalError);

		$scope.saveProfile = function () {
			saveSetupState.pending();

			var me = userService.getown();
			step(function () {
				if ($scope.profile.privateName) {
					makeNamePrivate(this);
				} else {
					this.ne();
				}
			}, h.sF(function () {
				me.setProfileAttribute("basic", {
					firstname: $scope.profile.firstName,
					lastname: $scope.profile.lastName
				}, this);
			}), h.sF(function () {
				me.uploadChangedProfile(this);
			}), h.sF(function () {
				if (h.isMail($scope.profile.mail)) {
					me.setMail($scope.profile.mail, this);
				} else {
					this.ne();
				}
			}), h.sF(function () {
				$state.go("app.main");
				this.ne();
			}), errorService.failOnError(saveSetupState));
		};
	}

	setupController.$inject = ["$scope", "$state", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.settingsService"];

	controllerModule.controller("ssn.setupController", setupController);
});
