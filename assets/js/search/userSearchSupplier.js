define(["angular", "bluebird", "whispeerHelper"], function (angular, Bluebird, h) {
	"use strict";
	return function () {
		angular.module("ssn.search").factory("userSearchSupplier", ["ssn.userService", "ssn.errorService", function (userService, errorService) {
			var Search = function () {
				this.debouncedAction = h.debouncePromise(Bluebird, this.debouncedSearch.bind(this), 500);
			};

			Search.prototype.search = function (query) {
				if (query.length < 3) {
					return Bluebird.reject("minimum3letters");
				}

				return this.debouncedAction(query);
			};

			Search.prototype.debouncedSearch = function (query) {
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
