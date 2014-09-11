/**
* loginController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function registerController($scope, errorService, sessionHelper, sessionService) {
		$scope.password = "";
		$scope.password2 = "";

		$scope.nickname = "";
		$scope.nicknameCheckLoading = false;
		$scope.nicknameCheck = false;
		$scope.nicknameCheckError = false;

		$scope.passwordStrength = function passwordStrengthC() {
			return sessionHelper.passwordStrength($scope.password);
		};

		$scope.registerFormClick = function formClickF() {
			sessionHelper.startKeyGeneration();
		};

		$scope.acceptIcon = function acceptIconC(value1, value2) {
			if (value1 === value2) {
				return "assets/img/accept.png";
			}

			return "assets/img/fail.png";
		};

		$scope.startKeyGeneration = function startKeyGen1() {
			sessionHelper.startKeyGeneration();
		};

		$scope.nicknameChange = function nicknameChange() {
			step(function nicknameCheck() {
				var internalNickname = $scope.nickname;
				$scope.nicknameCheckLoading = true;
				$scope.nicknameCheck = false;
				$scope.nicknameCheckError = false;

				sessionHelper.nicknameUsed(internalNickname, this);
			}, function nicknameChecked(e, nicknameUsed) {
				errorService.criticalError(e);

				$scope.nicknameCheckLoading = false;

				if (nicknameUsed === false) {
					$scope.nicknameCheck = true;
				} else if (nicknameUsed === true) {
					$scope.nicknameCheck = false;
				} else {
					$scope.nicknameCheckError = true;
				}
			});
		};

		$scope.showHint = false;

		$scope.nicknameInvalid = function () {
			return $scope.nickname === "" || !h.isNickname($scope.nickname);
		};

		$scope.nicknameUsed = function () {
			return !$scope.nicknameInvalid() && !$scope.nicknameCheck && !$scope.nicknameCheckLoading;
		};

		$scope.passwordToWeak = function () {
			return $scope.passwordStrength() < 1;
		};

		$scope.noPasswordMatch = function () {
			return $scope.password !== $scope.password2;
		};

		$scope.acceptIconNicknameFree = function acceptIconNickname() {
			if ($scope.nicknameCheckLoading) {
				return "assets/img/loader_green.gif";
			}

			if ($scope.nicknameCheckError === true) {
				return "assets/img/error.png";
			}

			if ($scope.nicknameCheck) {
				return "assets/img/accept.png";
			}

			return "assets/img/fail.png";
		};

		var defaultSettings = {
			encrypt: true,
			visibility: []
		};

		$scope.register = function doRegisterC() {
			var settings = {
				privacy: {
					basic: {
						firstname: {
							encrypt: false,
							visibility: ["always:allfriends"]
						},
						lastname: {
							encrypt: false,
							visibility: ["always:allfriends"]
						}
					},
					image: {
						encrypt: false,
						visibility: []
					},
					imageBlob: {
						encrypt: false,
						visibility: []
					},
					location: defaultSettings,
					birthday: defaultSettings,
					relationship: defaultSettings,
					education: defaultSettings,
					work: defaultSettings,
					gender: defaultSettings,
					languages: defaultSettings
				},
				sharePosts: ["always:allfriends"]
			};

			var profile = {
				pub: {},
				priv: {},
				nobody: {},
				metaData: {
					scope: "always:allfriends"
				}
			};

			step(function () {
				console.time("register");
				sessionService.setReturnURL("/setup");
				sessionHelper.register($scope.nickname, "", $scope.password, profile, undefined, settings, this);
			}, function () {
				console.timeEnd("register");
				console.log("register done!");
			});
		};
	}

	registerController.$inject = ["$scope", "ssn.errorService", "ssn.sessionHelper", "ssn.sessionService"];

	return registerController;
});