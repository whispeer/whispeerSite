var userService = require("users/userService").default;
var errorService = require("services/error.service").errorServiceInstance;

"use strict";
const angular = require("angular");
const Bluebird = require("bluebird");
const h = require("whispeerHelper").default;

module.exports = function () {
	angular.module("ssn.search").factory("userSearchSupplier", [function () {
		var Search = function () {
			this.debouncedAction = h.debouncePromise(Bluebird, this.debouncedSearch.bind(this), 2000);
		};

		Search.prototype.search = function (query) {
			if (query.length < 3) {
				return Bluebird.reject(new Error("minimum3letters"));
			}

			return this.debouncedAction(query);
		};

		Search.prototype.debouncedSearch = function (query) {
			return userService.query(query).bind(this).map(function (user) {
				return user.loadBasicData().thenReturn(user)
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
