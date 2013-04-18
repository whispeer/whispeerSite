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
		]
		
		$scope.loginForm = true;
		
		$scope.showLogin = function () {
			$scope.loginForm = true;
		};

		$scope.showRegister = function () {
			$scope.loginForm = false;
		};

		$scope.login = function() {	
			
		};

		$scope.register = function() {	
			
		};
	}

	loginController.$inject = ['$scope', 'ssn.loginService', '$locale'];

	return loginController;
});