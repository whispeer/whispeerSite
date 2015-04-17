define(["angular", "bluebird"], function (angular) {
	"use strict";
	return function () {
		angular.module("ssn.search").factory("filterSearchSupplier", [
				"localize", "ssn.keyStoreService", "ssn.filterService",
				function (localize, keyStore, filterService) {
			var Search = function () {};

			//how do we sort stuff?
			//first: alwaysAvailableFilter
			//second: circles
			//third: specific user

			function matchesQuery(query, val) {
				if (query === "") {
					return true;
				}

				if (val.toLowerCase().indexOf(query) > -1) {
					return true;
				}

				return false;
			}

			Search.prototype.search = function (query) {
				query = query.toLowerCase();

				return filterService.getAllFilters().then(function (filters) {
					filters.filter(function (filter) {
						return matchesQuery(query, filter.name);
					});
				});
			};

			return Search;
		}]);
	};
});
