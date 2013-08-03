/**
* LoginService
**/
define(["angular", "crypto/keyStore"], function (angular, keyStore, socketService) {
	"use strict";

	var service = function () {
		keyStore.upload.setSocket(socketService);
		return keyStore;
	};

	service.$inject = ["ssn.socketService"];

	return service;
});