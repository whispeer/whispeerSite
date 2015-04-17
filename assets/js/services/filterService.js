define(["whispeerHelper", "step", "bluebird", "asset/errors"], function (h, step, Bluebird, errors) {
	"use strict";

	var service = function (localize, keyStore, userService, circleService) {
		function alwaysFilterToKey(filter, cb) {
			switch (filter) {
				case "allfriends":
					cb(null, userService.getown().getFriendsKey());
					break;
				case "everyone":
					//we do not encrypt it anyhow .... this needs to be checked in before!
					throw new Error("should never be here");
				default:
					throw new errors.InvalidFilter("unknown always value");
			}
		}

		function circleFilterToKey(filter, cb) {
			step(function () {
				circleService.loadAll(this);
			}, h.sF(function () {
				this.ne(circleService.get(filter).getKey());
			}), cb);
		}

		function userFilterToKey(user, cb) {
			step(function () {
				userService.get(user, this);
			}, h.sF(function (user) {
				this.ne(user.getContactKey());
			}), cb);
		}

		function friendsFilterToKey(user, cb) {
			step(function () {
				userService.get(user, this);
			}, h.sF(function (user) {
				this.ne(user.getFriendsKey());
			}), cb);
		}

		function filterToKeys(filters, cb) {
			if (filters.length === 0) {
				cb(null, []);
			}

			step(function () {
				filters.forEach(function (filter) {
					var map = filter.split(":");

					switch(map[0]) {
						case "friends":
							friendsFilterToKey(map[1], this.parallel());
							break;
						case "always":
							alwaysFilterToKey(map[1], this.parallel());
							break;
						case "circle":
							circleFilterToKey(map[1], this.parallel());
							break;
						case "user":
							userFilterToKey(map[1], this.parallel());
							break;
						default:
							throw new errors.InvalidFilter("unknown group");
					}
				}, this);
			}, cb);
		}

		function getCircleByID(id) {
			var loadAllCircles = Bluebird.promisify(circleService.loadAll, circleService);

			return loadAllCircles().then(function () {
				var circle = circleService.get(id).data;
				return {
					name: circle.name,
					id: "circle:" + circle.id,
					count: circle.userids.length
				};
			});
		}

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

		function getAlwaysByID(id) {
			return {
				name: localize.getLocalizedString("directives." + id),
				id: "always:" + id,
				count: getAlwaysCount(id)
			};
		}

		function getFilterByID(id) {
			return Bluebird.try(function () {
				var domain = id.substr(0, 7);
				var domainID = id.substr(7);

				if (domain === "always:") {
					return getAlwaysByID(domainID);
				} else if (domain === "circle:") {
					return getCircleByID(domainID);
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

			var loadAllCircles = Bluebird.promisify(circleService.loadAll);

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

	return service;
});
