/**
* BaseService
**/
 
define(['angular', 'services/loginService', 'services/socketService'], function (angular, loginService, socketService) {
	var services = angular.module('ssn.services',[]);
	services.factory('ssn.loginService', loginService);
	services.factory('ssn.socketService', socketService);

	return services;
});