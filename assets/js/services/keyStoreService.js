/**
* LoginService
**/
define(["angular", "crypto/keyStore"], function (angular, keyStore) {
	"use strict";

	var service = function ($rootScope) {
		$rootScope.$on("ssn.reset", function () {
			keyStore.reset();
		});

		return keyStore;
	};

	service.$inject = ["$rootScope"];

	return service;
});