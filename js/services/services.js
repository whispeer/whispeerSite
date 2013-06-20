/**
* BaseService
**/

define([
	'angular',
	'services/socketService',
	'services/keyStoreService',
	'services/sessionService'
], function (angular, socketService, keyStoreService, sessionService) {
	"use strict";
	var services = angular.module('ssn.services', []);
	services.factory('ssn.socketService', socketService);
	services.factory('ssn.keyStoreService', keyStoreService);
	services.factory('ssn.sessionService', sessionService);

	return services;
});