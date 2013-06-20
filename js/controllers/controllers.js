/**
* Base Controller
**/

define(['angular', 'controllers/loginController', 'controllers/rootController', 'controllers/userController'], function (angular, loginController, rootController, userController) {
	var controllers = angular.module('ssn.controllers', ['ssn.services']);
	controllers.controller('ssn.rootController', rootController);
	controllers.controller('ssn.loginController', loginController);
	controllers.controller('ssn.userController', userController);

	return controllers;
});