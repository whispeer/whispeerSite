define(["angular", "bluebird"], function (angular, Promise) {
	"use strict";
	return function () {
		angular.module("ssn.search").factory("userSearchSupplier", ["userService", function (userService) {
			var Search = function (iAttrs) {
				this._iAttrs = iAttrs;
			};

			Search.prototype.search = function (query, iAttrs) {
				var action = Promise.promisify(userService.query, userService);

				return action(query).then(function (users) {
					if (!iAttrs.filter) {
						return users;
					}

					var filter = scope.$eval(iAttrs.filter);
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