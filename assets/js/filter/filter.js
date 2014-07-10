/**
* BaseFilter
**/
(function () {
	"use strict";
	define(["angular", "filter/dateFilter"], function (angular, dateFilter) {
		var filterProvider = angular.module("ssn.filter", []);

		filterProvider.filter("smartdate", dateFilter);
	});
})();