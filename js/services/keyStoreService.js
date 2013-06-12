/**
* LoginService
**/
define(['angular', 'keyStore'], function (angular, keyStore) {
	"use strict";

	var service = function () {
		return keyStore;
	};

	service.$inject = [];

	return service;
});