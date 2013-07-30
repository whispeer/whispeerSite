/**
* BaseService
**/

define([
	"angular",
	"services/socketService",
	"services/keyStoreService",
	"services/sessionService",
	"services/sessionHelper",
	"services/profileService",
	"services/storageService"
], function (angular, socketService, keyStoreService, sessionService, sessionHelper, profileService, storageService) {
	"use strict";
	var services = angular.module("ssn.services", []);
	services.factory("ssn.socketService", socketService);
	services.factory("ssn.keyStoreService", keyStoreService);
	services.factory("ssn.sessionService", sessionService);
	services.factory("ssn.sessionHelper", sessionHelper);
	services.factory("ssn.profileService", profileService);
	services.factory("ssn.storageService", storageService);

	return services;
});