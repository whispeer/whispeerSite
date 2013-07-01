/**
* BaseService
**/

define([
	'angular',
	'services/socketService',
	'services/keyStoreService',
	'services/sessionService',
	'services/profileService'
], function (angular, socketService, keyStoreService, sessionService, profileService) {
	"use strict";
	var services = angular.module('ssn.services', []);
	services.factory('ssn.socketService', socketService);
	services.factory('ssn.keyStoreService', keyStoreService);
	services.factory('ssn.sessionService', sessionService);
	services.factory('ssn.profileService', profileService);

	return services;
});