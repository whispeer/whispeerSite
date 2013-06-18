/**
* Base Controller
**/

define(['angular', 'controllers/loginController', 'controllers/sessionController'], function (angular, loginController, sessionController) {
	var controllers = angular.module('ssn.controllers', ['ssn.services']);
	controllers.controller('ssn.loginController', loginController);
	controllers.controller('ssn.sessionController', sessionController);

	return controllers;
});