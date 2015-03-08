/**
* LoginService
**/
define(["angular", "crypto/keyStore"], function (angular, keyStore) {
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

	return service;
});