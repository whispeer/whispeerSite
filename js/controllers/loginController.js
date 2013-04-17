/**
* loginController
**/
 
define(function () {
	'use strict';

	function loginController($scope, loginService) {
		$scope.variable = 'empty';
		
		$scope.loginForm = true;
		
		$scope.showLogin = function () {
			$scope.loginForm = true;
		};

		$scope.showRegister = function () {
			$scope.loginForm = false;
		};

		$scope.init = function () {
			console.log("test");
		};

		$scope.login = function() {	
			console.log(loginService);
			console.log('login() was called');
		};
	}

	loginController.$inject = ['$scope', 'ssn.loginService'];

	return loginController;
});