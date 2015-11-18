/**
* LoginService
**/
define(["services/serviceModule", "crypto/keyStore"], function (serviceModule, keyStore) {
	"use strict";

	var service = function ($rootScope, socketService) {
		$rootScope.$on("ssn.reset", function () {
			keyStore.reset();
		});

		keyStore.setAfterAsyncCall(function () {
			$rootScope.$apply();
		});

		keyStore.upload.setSocket(socketService);

		return keyStore;
	};

	serviceModule.factory("ssn.keyStoreService", ["$rootScope", "ssn.socketService", service]);
});
