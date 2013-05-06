/**
* loginController
**/

define(function () {
	'use strict';

	function loginController($scope, loginService) {
		$scope.password = "";
		$scope.password2 = "";

		$scope.mail = "";
		$scope.mail2 = "";

		$scope.nickname = "";

		$scope.identifier = "";

		$scope.loginFailed = false;
		$scope.loginSuccess = false;

		$scope.profileAttributes = [
			{
				name: "firstname",
				placeHolder: "Vorname",
				value: "",
				encrypted: false
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
			return loginService.passwordStrength($scope.password);
		};

		$scope.acceptIcon = function acceptIconC(value1, value2) {
			if (value1 === value2) {
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
				loginService.login(identifier, password, this);
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

		};
	}

	loginController.$inject = ['$scope', 'ssn.loginService'];

	return loginController;
});