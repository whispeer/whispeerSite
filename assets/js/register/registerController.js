/**
* loginController
**/

define([
		"step",
		"whispeerHelper",
		"asset/state",
		"register/registerModule",
		"services/errorService",
		"register/registerService",
		"services/locationService"
	], function (step, h, State, registerModule) {
	"use strict";

	function registerController($scope, errorService, registerService, locationService) {
		var registerState = new State();

		$scope.registerState = registerState.data;

		$scope.pwState = { password: "" };

		$scope.nickname = "";
		$scope.nicknameCheckLoading = false;
		$scope.nicknameCheck = false;
		$scope.nicknameCheckError = false;

		$scope.nickNameError = true;

		$scope.agb = false;

		window.setTimeout(function () {
			jQuery("#rnickname").focus();
		}, 50);

		$scope.registerFormClick = function formClickF() {
			registerService.startKeyGeneration();
		};

		$scope.startKeyGeneration = function startKeyGen1() {
			registerService.startKeyGeneration();
		};

		$scope.nicknameChange = function nicknameChange() {
			step(function nicknameCheck() {
				var internalNickname = $scope.nickname;
				$scope.nicknameCheckLoading = true;
				$scope.nicknameCheck = false;
				$scope.nicknameCheckError = false;

				registerService.nicknameUsed(internalNickname, this);
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

		$scope.empty = function (val) {
			return val === "" || !h.isset(val);
		};

		$scope.nicknameEmpty = function () {
			return $scope.empty($scope.nickname);
		};

		$scope.nicknameInvalid = function () {
			return !$scope.empty($scope.nickname) && !h.isNickname($scope.nickname);
		};

		$scope.nicknameUsed = function () {
			return !$scope.empty($scope.nickname) && h.isNickname($scope.nickname) && !$scope.nicknameCheck && !$scope.nicknameCheckLoading;
		};

		$scope.isAgbError = function () {
			return !$scope.agb;
		};

		$scope.validationOptions = {
			validateOnCallback: true,
			hideOnInteraction: true
		};

		$scope.acceptIconNicknameFree = function acceptIconNickname() {
			if ($scope.nicknameCheckLoading) {
				return "fa-spinner";
			}

			if ($scope.nicknameCheckError === true) {
				return "fa-warning";
			}

			if ($scope.nicknameCheck) {
				return "fa-check";
			}

			return "fa-times";
		};

		$scope.nicknameValidations = [
			{ validator: "nicknameEmpty()", translation: "login.register.errors.nickEmpty" },
			{ validator: "nicknameInvalid()", translation: "login.register.errors.nickInvalid", onChange: 500 },
			{ validator: "nicknameUsed()", translation: "login.register.errors.nickUsed", onChange: 500 }
		];

		$scope.agbValidations = [
			{ validator: "isAgbError()", translation: "login.register.errors.agb" }
		];


		$scope.register = function doRegisterC() {
			registerState.pending();
			if ($scope.validationOptions.checkValidations()) {
				registerState.failed();
				return;
			}

			var settings = {};

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
				locationService.setReturnUrl("/setup");
				registerService.register($scope.nickname, "", $scope.pwState.password, profile, settings, this);
			}, function (e) {
				if (!e) {
					locationService.mainPage();
				}

				console.timeEnd("register");
				console.log("register done!");

				this(e);
			}, errorService.failOnError(registerState));
		};
	}

	registerController.$inject = ["$scope", "ssn.errorService", "ssn.registerService", "ssn.locationService", "ssn.socketService"];

	registerModule.controller("ssn.registerController", registerController);
});
