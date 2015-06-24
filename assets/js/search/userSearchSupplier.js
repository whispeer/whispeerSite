define(["angular", "bluebird"], function (angular, Bluebird) {
	"use strict";
	return function () {
		angular.module("ssn.search").factory("userSearchSupplier", ["ssn.userService", "ssn.errorService", function (userService, errorService) {
			var Search = function () {};

			Search.prototype.search = function (query) {
				if (query.length < 3) {
					return Bluebird.reject("minimum3letters");
				}

				var action = Bluebird.promisify(userService.query, userService);

				return action(query).bind(this).map(function (user) {
					var loadBasicData = Bluebird.promisify(user.loadBasicData, user);
					return loadBasicData().then(function () {
						return user;
					});
				}).then(function (users) {
					return users.map(function (user) {
						user.loadFullData(errorService.criticalError);
						return user.data;
					});
				});
			};

			return Search;
		}]);
	};
});
