/**
* LoginService
**/
define(["angular", "crypto/keyStore"], function (angular, keyStore) {
	"use strict";

	var service = function (socketService, $rootScope) {
		keyStore.upload.setSocket(socketService);

		$rootScope.$on("ssn.reset", function () {
			keyStore.reset();
		})

		return keyStore;
	};

	service.$inject = ["ssn.socketService", "$rootScope"];

	return service;
});