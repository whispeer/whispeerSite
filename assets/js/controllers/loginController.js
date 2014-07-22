/**
* loginController
**/

define(["step"], function (step) {
	"use strict";

	function loginController($scope, errorService, sessionHelper, cssService) {
		cssService.setClass("registerView");

		$scope.password = "";

		$scope.identifier = "";

		$scope.loginFailed = false;
		$scope.loginSuccess = false;

		$scope.mailCheck = false;
		$scope.mailCheckError = false;
		$scope.mailCheckLoading = false;

		$scope.profileAttributes = [
			{
				topic: "basic",
				name: "firstname",
				placeHolder: "Vorname",
				value: "",
				encrypted: false,
				hoverText: "Vorname!"
			},
			{
				topic: "basic",
				name: "lastname",
				placeHolder: "Nachname",
				value: "",
				encrypted: false
			}
		];

		$scope.validImage = true;

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

		$scope.mailChange = function mailChange() {
			step(function doMailCheck() {
				var internalMail = $scope.mail;
				$scope.mailCheckLoading = true;
				$scope.mailCheck = false;
				$scope.mailCheckError = false;

				sessionHelper.mailUsed(internalMail, this);
			}, function mailChecked(e, mailUsed) {
				if (e) {
					errorService.criticalError(e);
				}

				$scope.mailCheckLoading = false;

				if (mailUsed === false) {
					$scope.mailCheck = true;
				} else if (mailUsed === true) {
					$scope.mailCheck = false;
				} else {
					$scope.mailCheckError = true;
				}
			});
		};

		$scope.lock = function lockF(bool) {
			if (bool) {
				return "assets/img/lock_closed.png";
			} else {
				return "assets/img/lock_open.png";
			}
		};

		$scope.red = function redF(bool) {
			if (!bool) {
				return "red";
			} else {
				return "";
			}
		};

		$scope.acceptIconMailFree = function acceptIconMail() {
			if ($scope.mailCheckLoading) {
				return "assets/img/loader_green.gif";
			}

			if ($scope.mailCheckError === true) {
				return "assets/img/error.png";
			}

			if ($scope.mailCheck) {
				return "assets/img/accept.png";
			}

			if ($scope.mail === "") {
				return "assets/img/accept.png";
			}

			return "assets/img/fail.png";
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

		function loginFailed() {
			$scope.loginFailed = true;
			$scope.loginSuccess = false;
		}

		function loginSuccess() {
			$scope.loginFailed = false;
			$scope.loginSuccess = true;
		}

		$scope.login = function loginCF(identifier, password) {
			step(function () {
				sessionHelper.login(identifier, password, this);
			}, function (e) {
				if (e) {
					loginFailed();
				} else {
					loginSuccess();
				}
			});
		};
	}

	loginController.$inject = ["$scope", "ssn.errorService", "ssn.sessionHelper", "ssn.cssService"];

	return loginController;
});