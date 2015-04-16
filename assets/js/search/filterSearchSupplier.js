define(["angular", "bluebird"], function (angular, Bluebird) {
	"use strict";
	return function () {
		angular.module("ssn.search").factory("filterSearchSupplier", ["localize", "ssn.keyStoreService", "ssn.userService", "ssn.circleService", function (localize, keyStore, userService, circleService) {
			var Search = function () {};

			//how do we sort stuff?
			//first: alwaysAvailableFilter
			//second: circles
			//third: specific user

			var alwaysAvailableFilter = ["allfriends"];

			function getAlwaysCount(id) {
				var key, me = userService.getown();

				switch(id) {
					case "allfriends":
						key = me.getFriendsKey();
						break;
					default:
						return 0;
				}

				return keyStore.upload.getKeyAccessCount(key) - 1;
			}

			function matchesQuery(query, val) {
				if (query === "") {
					return true;
				}

				if (val.toLowerCase().indexOf(query) > -1) {
					return true;
				}

				return false;
			}

			function matchEach(vals, query, attr, cb) {
				var i, cur, result = [];

				for (i = 0; i < vals.length; i += 1) {
					cur = vals[i];
					if (typeof attr === "function") {
						if (matchesQuery(query, attr(cur))) {
							result.push(cb(cur));
						}
					} else if (matchesQuery(query, cur[attr])) {
						result.push(cb(cur));
					}
				}

				return result;
			}

			Search.prototype.search = function (query) {
				query = query.toLowerCase();

				var alwaysAvailable = matchEach(alwaysAvailableFilter, query, function (e) {
					return localize.getLocalizedString("directives." + e);
				}, function (e) {
					return {
						name: localize.getLocalizedString("directives." + e),
						id: "always:" + e,
						count: getAlwaysCount(e)
					};
				});

				var loadAllCircles = Bluebird.promisify(circleService.loadAll);

				return loadAllCircles().then(function () {
					var circles = circleService.data.circles;

					var circle = matchEach(circles, query, "name", function (e) {
						return {
							name: e.name,
							id: "circle:" + e.id,
							count: e.userids.length
						};
					});

					return alwaysAvailable.concat(circle);
				});
			};

			return Search;
		}]);
	};
});
