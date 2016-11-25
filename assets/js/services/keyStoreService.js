/**
* LoginService
**/
define(["services/serviceModule", "crypto/keyStore", "services/requestKeyService"], function (serviceModule, keyStore) {
	"use strict";

	var service = function ($rootScope, requestKeyService) {
		$rootScope.$on("ssn.reset", function () {
			keyStore.reset();
		});

		keyStore.upload.setKeyGet(requestKeyService.getKey);

		return keyStore;
	};

	serviceModule.factory("ssn.keyStoreService", ["$rootScope", "ssn.requestKeyService", service]);
});
