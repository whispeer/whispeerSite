var userService = require("users/userService").default;

"use strict";
const angular = require("angular");
const Bluebird = require("bluebird");

module.exports = function () {
	angular.module("ssn.search").factory("friendsSearchSupplier", [function () {
		var Search = function () {};

		Search.prototype.search = function (query) {
			if (query.length < 3) {
				return Bluebird.reject(new Error("minimum3letters"));
			}

			return userService.queryFriends(query).bind(this).map(function (user) {
				return user.loadBasicData().thenReturn(user);
			}).then(function (users) {
				return users.map(function (e) {
					return e.data;
				});
			});
		};

		return Search;
	}]);
};
