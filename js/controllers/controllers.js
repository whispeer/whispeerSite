/**
* Base Controller
**/

define(['angular', 'controllers/loginController', 'controllers/rootController', 'controllers/userController', 'controllers/mainController'], function (angular, loginController, rootController, userController, mainController) {
	"use strict";
	var controllers = angular.module('ssn.controllers', ['ssn.services']);
	controllers.controller('ssn.rootController', rootController);
	controllers.controller('ssn.loginController', loginController);
	controllers.controller('ssn.userController', userController);
	controllers.controller('ssn.mainController', mainController);

	return controllers;
});