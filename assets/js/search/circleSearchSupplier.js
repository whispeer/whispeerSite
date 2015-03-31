define(["angular", "bluebird"], function (angular, Promise) {
	"use strict";
	return function () {
		angular.module("ssn.search").factory("circleSearchSupplier", ["ssn.circleService", function (circleService) {
			var Search = function () {};

			Search.prototype.search = function (query, filter) {
				var action = Promise.promisify(circleService.loadAll, circleService);

				return action().bind(this).then(function () {
					var circles = circleService.data.circles;

					if (query === "") {
						return circles;
					}

					return circles.filter(function (circle) {
						return circle.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
					});
				});
			};

			return Search;
		}]);
	};
});
