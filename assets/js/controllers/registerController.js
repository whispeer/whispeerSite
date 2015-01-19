/**
* loginController
**/

define(["step", "whispeerHelper", "asset/state"], function (step, h, State) {
	"use strict";

	function registerController($scope, $timeout, $routeParams, keyStore, errorService, sessionHelper, sessionService, socketService) {
		var inviteCodeState = new State();
		var inviteMailState = new State();
		var registerState = new State();

		$scope.registerState = registerState.data;

		$scope.invite = {
			code: $routeParams.inviteCode || "",
			valid: inviteCodeState.data,
			mailValid: inviteMailState.data,
			request: function (mail) {
				inviteMailState.pending();

				if (!h.isMail(mail)) {
					inviteMailState.failed();
					return;
				}

				step(function () {
					socketService.emit("invites.requestWithMail", { mail: mail }, this);
				}, errorService.failOnError(inviteMailState));
			}
		};

		$scope.$watch(function () {
			return $scope.invite.code;
		}, function (value) {
			if (value.length !== 10) {
				inviteCodeState.failed();
				return;
			}

			inviteCodeState.pending();
			step(function () {
				if (socketService.isConnected()) {
					this();
				} else {
					socketService.once("connect", this.ne);
				}
			}, h.sF(function () {
				sessionHelper.checkInviteCode(value, this);
			}), h.sF(function (valid) {
				if (!valid) {
					throw new Error("code not valid");
				}

				this.ne();
			}), errorService.failOnError(inviteCodeState));
		});

		$scope.password = "";
		$scope.password2 = "";

		$scope.nickname = "";
		$scope.nicknameCheckLoading = false;
		$scope.nicknameCheck = false;
		$scope.nicknameCheckError = false;

		$scope.nickNameError = true;

		$scope.agb = false;

		$scope.passwordStrength = function passwordStrengthC() {
			return sessionHelper.passwordStrength($scope.password);
		};

		if ($routeParams.register) {
			$timeout(function () {
				jQuery("#rnickname").focus();
			}, 50);
		}

		$scope.registerFormClick = function formClickF() {
			sessionHelper.startKeyGeneration();
		};

		$scope.acceptIcon = function acceptIconC(value1, value2) {
			if (value1 === value2) {
				return "fa-check";
			}

			return "fa-times";
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
			return !$scope.empty($scope.nickname) && !$scope.nicknameCheck && !$scope.nicknameCheckLoading;
		};

		$scope.passwordEmpty = function () {
			return $scope.empty($scope.password);
		};

		$scope.passwordToWeak = function () {
			return !$scope.empty($scope.password) && $scope.passwordStrength() < 1;
		};

		$scope.password2Empty = function () {
			return $scope.empty($scope.password2);
		};

		$scope.noPasswordMatch = function () {
			return $scope.password !== $scope.password2;
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

		$scope.passwordValidations = [
			{ validator: "passwordEmpty()", translation: "login.register.errors.passwordEmpty" },
			{ validator: "passwordToWeak()", translation: "login.register.errors.passwordWeak", onChange: 500 }
		];

		$scope.password2Validations = [
			{ validator: "password2Empty()", translation: "login.register.errors.password2Empty" },
			{ validator: "noPasswordMatch()", translation: "login.register.errors.passwordNoMatch" }
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
			var imageBlob;

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
				sessionHelper.register($scope.nickname, "", $scope.invite.code, $scope.password, profile, imageBlob, settings, this);
			}, function (e) {
				console.timeEnd("register");
				console.log("register done!");

				this(e);
			}, errorService.failOnError(registerState));
		};
	}

	registerController.$inject = ["$scope", "$timeout", "$routeParams", "ssn.keyStoreService", "ssn.errorService", "ssn.sessionHelper", "ssn.sessionService", "ssn.socketService"];

	return registerController;
});