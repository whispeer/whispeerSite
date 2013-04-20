/**
* BaseService
**/
 
define(['angular', 'services/loginService', 'services/socketService', 'services/keyStoreService'], function (angular, loginService, socketService, keyStoreService) {
	var services = angular.module('ssn.services',[]);
	services.factory('ssn.loginService', loginService);
	services.factory('ssn.socketService', socketService);
	services.factory('ssn.keyStoreService', keyStoreService);

	return services;
});