/**
* BaseService
**/

var services = ["socketService", "keyStoreService", "sessionService", "sessionHelper", "profileService", "storageService", "userService", "cssService", "magicbarService", "messageService", "circleService"];

var includes = ["angular"];

var i;
for (i = 0; i < services.length; i += 1) {
	includes.push("services/" + services[i]);
}

console.log(JSON.stringify(includes));

define(includes, function (angular) {
	"use strict";
	var servicesProvider = angular.module("ssn.services", []);

	var i;
	for (i = 0; i < services.length; i += 1) {
		servicesProvider.factory("ssn." + services[i], arguments[i+1]);
	}

	return services;
});