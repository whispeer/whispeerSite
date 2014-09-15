/**
* loginController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function registerController($scope, $timeout, errorService, sessionHelper, sessionService) {
		$scope.password = "";
		$scope.password2 = "";

		$scope.nickname = "";
		$scope.nicknameCheckLoading = false;
		$scope.nicknameCheck = false;
		$scope.nicknameCheckError = false;

		$scope.nickNameError = true;
		$scope.registerFailed = false;

		$scope.agb = false;

		$scope.passwordStrength = function passwordStrengthC() {
			return sessionHelper.passwordStrength($scope.password);
		};

		var onlyError;
		$scope.inputsUsed = function () {
			$scope.registerFailed = false;
			onlyError = false;
		};

		var timeout;

		$scope.inputUsed = function (checkFunction) {
			if (timeout) {
				$timeout.cancel(timeout);
			}

			timeout = $timeout(function () {
				if (!$scope.registerFailed) {
					onlyError = checkFunction;
					$scope.registerFailed = true;
				}
			}, 500);
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

		var errors = [];

		function notPrevious(func) {
			if (onlyError) {
				return onlyError === func;
			}

			var filter = true, result = true;
			errors.filter(function (val) {
				if (val === func) {
					filter = false;
				}
				return filter;
			}).map(function (func) {
				return func();
			}).forEach(function (invalid) {
				if (invalid) {
					result = false;
				}
			});

			return result;
		}

		$scope.empty = function (val) {
			return val === "" || !h.isset(val);
		};

		$scope.nicknameEmpty = function () {
			return $scope.empty($scope.nickname);
		};

		$scope.nicknameInvalid = function () {
			return notPrevious($scope.nicknameInvalid) && !h.isNickname($scope.nickname);
		};

		$scope.nicknameUsed = function () {
			return notPrevious($scope.nicknameUsed) && !$scope.nicknameCheck && !$scope.nicknameCheckLoading;
		};

		$scope.passwordEmpty = function () {
			return notPrevious($scope.passwordEmpty) && $scope.empty($scope.password);
		};

		$scope.passwordToWeak = function () {
			return notPrevious($scope.passwordToWeak) && $scope.passwordStrength() < 1;
		};

		$scope.password2Empty = function () {
			return notPrevious($scope.password2Empty) && $scope.empty($scope.password2);
		};

		$scope.noPasswordMatch = function () {
			return notPrevious($scope.noPasswordMatch) &&  $scope.password !== $scope.password2;
		};

		$scope.isAgbError = function () {
			return notPrevious($scope.isAgbError) && !$scope.agb;
		};

		errors = [
			$scope.nicknameEmpty,
			$scope.nicknameInvalid,
			$scope.nicknameUsed,
			$scope.passwordEmpty,
			$scope.passwordToWeak,
			$scope.password2Empty,
			$scope.noPasswordMatch,
			$scope.isAgbError
		];

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
			if ($scope.passwordStrength() === 0 || $scope.password !== $scope.password2 || !$scope.agb || !$scope.notEmpty($scope.nickname)) {
				$scope.registerFailed = true;
				onlyError = false;
				return;
			}

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

	registerController.$inject = ["$scope", "$timeout", "ssn.errorService", "ssn.sessionHelper", "ssn.sessionService"];

	return registerController;
});