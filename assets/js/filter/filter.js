/**
* BaseFilter
**/
(function () {
	define(["angular", "filter/dateFilter"], function (angular, dateFilter) {
		"use strict";
		var filterProvider = angular.module("ssn.filter", []);

		filterProvider.filter("smartdate", dateFilter);
	});
})();