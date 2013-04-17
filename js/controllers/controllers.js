/**
* Base Controller
**/

define(['angular', 'controllers/loginController'], function (angular, loginController) {
	var controllers = angular.module('ssn.controllers', ['ssn.services']);
	controllers.controller('ssn.loginController', loginController);

	return controllers;
});