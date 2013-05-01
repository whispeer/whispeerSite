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

		$scope.login = loginService.login;

		$scope.register = function doRegisterC() {

		};
	}

	loginController.$inject = ['$scope', 'ssn.loginService'];

	return loginController;
});