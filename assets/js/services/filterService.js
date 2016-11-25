define(["whispeerHelper", "bluebird", "asset/errors", "services/serviceModule"], function (h, Bluebird, errors, serviceModule) {
	"use strict";

	var service = function (localize, keyStore, userService, circleService) {
		function alwaysFilterToKey(filter) {
			switch (filter) {
				case "allfriends":
					return userService.getown().getFriendsKey();
				case "everyone":
					//we do not encrypt it anyhow .... this needs to be checked in before!
					throw new Error("should never be here");
				default:
					throw new errors.InvalidFilter("unknown always value");
			}
		}

		function circleFilterToKey(filter) {
			return Bluebird.try(function () {
				return circleService.loadAll();
			}).then(function () {
				return circleService.get(filter).getKey();
			});
		}

		function userFilterToKey(user) {
			return Bluebird.try(function () {
				return userService.get(user);
			}).then(function (user) {
				return user.getContactKey();
			});
		}

		function friendsFilterToKey(user) {
			return Bluebird.try(function () {
				return userService.get(user);
			}).then(function (user) {
				return user.getFriendsKey();
			});
		}

		function filterToKeys(filters, cb) {
			return Bluebird.try(function () {
				var filterPromises = filters.map(function (filter) {
					var map = filter.split(":");

					switch(map[0]) {
						case "friends":
							return friendsFilterToKey(map[1]);
						case "always":
							return alwaysFilterToKey(map[1]);
						case "circle":
							return circleFilterToKey(map[1]);
						case "user":
							return userFilterToKey(map[1]);
						default:
							throw new errors.InvalidFilter("unknown group");
					}
				});

				filterPromises.push(userService.getown().getMainKey());

				return Bluebird.all(filterPromises);
			}).nodeify(cb);
		}

		function getCircleByID(id) {
			var loadAllCircles = Bluebird.promisify(circleService.loadAll.bind(circleService));

			return loadAllCircles().then(function () {
				var circle = circleService.get(id).data;
				return {
					name: circle.name,
					id: "circle:" + circle.id,
					sref: "app.circles.show({circleid: " + circle.id + "})",
					count: circle.userids.length
				};
			});
		}

		function getFriendsFilterByID(id) {
			var getUser = Bluebird.promisify(userService.get.bind(userService));
			return getUser(id).then(function (user) {
				return {
					name: localize.getLocalizedString("directives.friendsOf", {name: user.data.name}),
					id: "friends:" + user.data.id,
					sref: "app.user({identifier: " + user.data.id + "})"
				};
			});
		}

		function getAlwaysByID(id) {
			if (id !== "allfriends") {
				throw new Error("Invalid Always id");
			}

			var key = userService.getown().getFriendsKey();

			return {
				name: localize.getLocalizedString("directives.allfriends"),
				id: "always:" + id,
				sref: "app.friends",
				count: keyStore.upload.getKeyAccessCount(key) - 1
			};
		}

		function getFilterByID(id) {
			return Bluebird.try(function () {
				var colon = id.indexOf(":");
				var domain = id.substr(0, colon + 1);
				var domainID = id.substr(colon + 1);

				if (domain === "always:") {
					return getAlwaysByID(domainID);
				} else if (domain === "circle:") {
					return getCircleByID(domainID);
				} else if (domain === "friends:") {
					return getFriendsFilterByID(domainID);
				}
			});
		}

		function getFiltersByID(ids) {
			return Bluebird.resolve(ids).map(getFilterByID);
		}

		var alwaysAvailableFilter = ["allfriends"];

		function getAllFilters() {
			var alwaysAvailable = alwaysAvailableFilter.map(function (e) {
				return getAlwaysByID(e);
			});

			var loadAllCircles = Bluebird.promisify(circleService.loadAll.bind(circleService));

			return loadAllCircles().then(function () {
				var circles = circleService.data.circles;

				var circle = circles.map(function (e) {
					return {
						name: e.name,
						id: "circle:" + e.id,
						count: e.userids.length
					};
				});

				return alwaysAvailable.concat(circle);
			});
		}

		var res = {
			filterToKeys: filterToKeys,

			getFilterByID: getFilterByID,
			getFiltersByID: getFiltersByID,

			getAlwaysByID: getAlwaysByID,
			getCircleByID: getCircleByID,

			getAllFilters: getAllFilters
		};

		return res;
	};

	service.$inject = ["localize", "ssn.keyStoreService", "ssn.userService", "ssn.circleService"];

	serviceModule.factory("ssn.filterService", service);
});
