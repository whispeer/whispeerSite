/**
* LoginService
**/
define(["services/serviceModule", "crypto/keyStore"], function (serviceModule, keyStore) {
	"use strict";

	var service = function ($rootScope, requestKeyService) {
		$rootScope.$on("ssn.reset", function () {
			keyStore.reset();
		});

		keyStore.setAfterAsyncCall(function () {
			$rootScope.$apply();
		});

		keyStore.upload.setKeyGet(requestKeyService.getKey);

		return keyStore;
	};

	serviceModule.factory("ssn.keyStoreService", ["$rootScope", "ssn.requestKeyService", service]);
});
