/**
* loginController
**/

define(['step'], function (step) {
	'use strict';

	function loginController($scope, sessionService) {
		$scope.$parent.cssClass = "registerView";

		$scope.password = "";
		$scope.password2 = "";

		$scope.mail = "";
		$scope.mail2 = "";

		$scope.nickname = "";

		$scope.identifier = "";

		$scope.loginFailed = false;
		$scope.loginSuccess = false;

		$scope.mailCheck = false;
		$scope.mailCheckError = false;
		$scope.mailCheckLoading = false;

		$scope.safeApply = function (fn) {
			var phase = this.$root.$$phase;
			if (phase === '$apply' || phase === '$digest') {
				if (fn && (typeof fn === 'function')) {
					fn();
				}
			} else {
				this.$apply(fn);
			}
		};

		$scope.profileAttributes = [
			{
				name: "firstname",
				placeHolder: "Vorname",
				value: "",
				encrypted: false,
				hoverText: "Vorname!"
			},
			{
				name: "lastname",
				placeHolder: "Nachname",
				value: "",
				encrypted: false
			}
		];

		//gui show stuff
		$scope.loginForm = true;
		$scope.showLogin = function showLoginForm() {
			$scope.loginForm = true;
		};

		$scope.showRegister = function showRegisterForm() {
			$scope.loginForm = false;
		};

		$scope.passwordStrength = function passwordStrengthC() {
			return sessionService.passwordStrength($scope.password);
		};


		$scope.registerFormClick = function formClickF() {
			console.log("click!");
			sessionService.startKeyGeneration();
		};

		$scope.acceptIcon = function acceptIconC(value1, value2) {
			if (value1 === value2) {
				return 'img/accept.png';
			}

			return 'img/fail.png';
		};

		$scope.startKeyGeneration = function startKeyGen1() {
			loginSerivce.startKeyGeneration();
		};

		$scope.mailChange = function mailChange() {
			step(function doMailCheck() {
				var internalMail = $scope.mail;
				$scope.mailCheckLoading = true;
				$scope.mailCheck = false;
				$scope.mailCheckError = false;

				sessionService.mailUsed(internalMail, this);
			}, function mailChecked(e, mailUsed) {
				if (e) {
					console.log(e);
				}

				$scope.safeApply(function () {
					$scope.mailCheckLoading = false;

					if (mailUsed === false) {
						$scope.mailCheck = true;
					} else if (mailUsed === true) {
						$scope.mailCheck = false;
					} else {
						$scope.mailCheckError = true;
					}
				});
			});
		};

		$scope.acceptIconMailFree = function acceptIconMail() {
			if ($scope.mailCheckLoading) {
				return 'img/loading.gif';
			}

			if ($scope.mailCheckError === true) {
				return 'img/error.png';
			}

			if ($scope.mailCheck) {
				return 'img/accept.png';
			}

			return 'img/fail.png';
		};

		$scope.nicknameChange = function nicknameChange() {
			step(function nicknameCheck() {
				var internalNickname = $scope.nickname;
				$scope.nicknameCheckLoading = true;
				$scope.nicknameCheck = false;
				$scope.nicknameCheckError = false;

				sessionService.nicknameUsed(internalNickname, this);
			}, function nicknameChecked(e, nicknameUsed) {
				if (e) {
					console.log(e);
				}

				$scope.safeApply(function () {
					$scope.nicknameCheckLoading = false;

					if (nicknameUsed === false) {
						$scope.nicknameCheck = true;
					} else if (nicknameUsed === true) {
						$scope.nicknameCheck = false;
					} else {
						$scope.nicknameCheckError = true;
					}
				});
			});
		};

		$scope.acceptIconNicknameFree = function acceptIconNickname() {
			if ($scope.nicknameCheckLoading) {
				return 'img/loading.gif';
			}

			if ($scope.nicknameCheckError === true) {
				return 'img/error.png';
			}

			if ($scope.nicknameCheck) {
				return 'img/accept.png';
			}

			return 'img/fail.png';
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
				sessionService.login(identifier, password, this);
			}, function (e, result) {
				console.log(e);
				if (e) {
					if (e.userNotExisting) {
						$scope.$apply(loginFailed);
					}

					if (e.invalidCredentials) {
						$scope.$apply(loginFailed);
					}
				} else {
					$scope.$apply(loginSuccess);
				}
			});
		};

		$scope.register = function doRegisterC() {
			sessionService.register(function () {
			});
		};
	}

	loginController.$inject = ['$scope', 'ssn.sessionService'];

	return loginController;
});