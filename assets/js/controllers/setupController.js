/**
* setupController
**/

define(["bluebird", "whispeerHelper", "asset/state", "libs/qr", "libs/filesaver", "controllers/controllerModule"], function (Bluebird, h, State, qr, saveAs, controllerModule) {
	"use strict";

	function setupController($scope, $state, cssService, errorService, userService, settingsService) {
		cssService.setClass("setupView");

		var saveSetupState = new State.default();
		$scope.saveSetupState = saveSetupState.data;

		$scope.profileSaved = false;
		$scope.profile = {
			privateName: false,
			firstName: "",
			lastName: "",
			mail: ""
		};

		function makeNamePrivate(cb) {
			return Bluebird.try(function () {
				var safetySettings = settingsService.getBranch("privacy");

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
				settingsService.updateBranch("privacy", safetySettings);
				return settingsService.uploadChangedData();
			}).nodeify(cb);
		}

		Bluebird.try(function () {
			var me = userService.getown();
			$scope.profile.mail = me.getMail();
			return me.getName();
		}).then(function (names) {
			$scope.profile.firstName = names.firstname;
			$scope.profile.lastName = names.lastname;
		}).catch(errorService.criticalError);

		$scope.saveProfile = function () {
			saveSetupState.pending();

			var me = userService.getown();
			var savePromise = Bluebird.try(function () {
				if (!$scope.profile.privateName) {
					return;
				}

				return makeNamePrivate();
			}).then(function () {
				return me.setProfileAttribute("basic", {
					firstname: $scope.profile.firstName,
					lastname: $scope.profile.lastName
				});
			}).then(function () {
				return me.uploadChangedProfile();
			}).then(function () {
				if (!h.isMail($scope.profile.mail)) {
					return;
				}

				return me.setMail($scope.profile.mail, this);
			}).then(function () {
				$state.go("app.main");
			});

			errorService.failOnErrorPromise(saveSetupState, savePromise);
		};
	}

	setupController.$inject = ["$scope", "$state", "ssn.cssService", "ssn.errorService", "ssn.userService", "ssn.settingsService"];

	controllerModule.controller("ssn.setupController", setupController);
});
