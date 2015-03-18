define(["angular", "search/userSearchSupplier"], function (angular) {
	"use strict";
	angular.module("ssn.search", []);

	var i;
	for (i = 1; i < arguments.length; i += 1) {
		arguments[i]();
	}
});