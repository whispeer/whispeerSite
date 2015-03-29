define(["angular", "bluebird"], function (angular, Promise) {
	"use strict";
	return function () {
		angular.module("ssn.search").factory("userSearchSupplier", ["ssn.userService", function (userService) {
			var Search = function () {};

			Search.prototype.search = function (query, filter) {
				var action = Promise.promisify(userService.query, userService);

				return action(query).bind(this).then(function (users) {
					if (!filter) {
						return users;
					}

					return users.filter(function (user) {
						return filter.indexOf(user.getID()) === -1;
					});
				}).map(function (user) {
					var loadBasicData = Promise.promisify(user.loadBasicData, user);
					return loadBasicData().then(function () {
						return user;
					});
				}).then(function (users) {
					return users.map(function (e) {
						return e.data;
					});						
				});
			};

			return Search;
		}]);
	};
});
