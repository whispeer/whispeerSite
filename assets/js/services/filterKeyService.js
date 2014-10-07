define(["whispeerHelper", "step", "asset/errors"], function (h, step, errors) {
	"use strict";

	var service = function (userService, circleService) {
		function removeDoubleFilter(filter) {
			var currentFilter, currentFilterOrder = 0;
			var filterOrder = {
				allfriends: 1,
				everyone: 3
			};

			var i, cur;
			for (i = 0; i < filter.length; i += 1) {
				cur = filter[i];
				if (currentFilterOrder < filterOrder[cur]) {
					currentFilter = cur;
					currentFilterOrder = filterOrder[cur];
				}
			}

			return currentFilter;
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

		var res = {
			filterToKeys: filterToKeys,
			removeDoubleFilter: removeDoubleFilter
		};

		return res;
	};

	service.$inject = ["ssn.userService", "ssn.circleService"];

	return service;
});