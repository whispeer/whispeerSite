/**
* LoginService
**/
define(["services/serviceModule", "crypto/keyStore"], function (serviceModule, keyStore) {
	"use strict";

	var service = function ($rootScope) {
		$rootScope.$on("ssn.reset", function () {
			keyStore.reset();
		});

		keyStore.setAfterAsyncCall(function (cb) {
			$rootScope.$apply(function () {
				cb();
			});
		});

		return keyStore;
	};

	service.$inject = ["$rootScope"];

	serviceModule.factory("ssn.keyStoreService", service);
});
