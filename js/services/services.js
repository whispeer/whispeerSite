/**
* BaseService
**/
 
define(['angular', 'services/loginService'], function (angular, loginService) {
	var services = angular.module('ssn.services',[]);
	services.factory('ssn.loginService', loginService);

	return services;
});