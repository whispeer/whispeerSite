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

		function filterToKeys(filter, cb) {
			var alwaysFilter = [], userFriendsFilter = [], userFilter = [], circleFilter = [];

			if (!filter) {
				filter = ["always:allfriends"];
			}

			var i, map;
			for (i = 0; i < filter.length; i += 1) {
				map = filter[i].split(":");
				switch(map[0]) {
					case "friends":
						userFriendsFilter.push(map[1]);
						break;
					case "always":
						alwaysFilter.push(map[1]);
						break;
					case "circle":
						circleFilter.push(map[1]);
						break;
					case "user":
						userFilter.push(map[1]);
						break;
					default:
						throw new errors.InvalidFilter("unknown group");
				}
			}

			step(function () {
				this.parallel.unflatten();
				circleFilterToKeys(circleFilter, this.parallel());
				userFilterToKeys(userFilter, this.parallel());
				userFriendsFilterToKeys(userFriendsFilter, this.parallel());
			}, h.sF(function (circleKeys, userKeys, userFriendsKeys) {
				var alwaysKeys = alwaysFilterToKeys(alwaysFilter);
				var keys = alwaysKeys.concat(circleKeys).concat(userKeys).concat(userFriendsKeys);

				this.ne(keys);
			}), cb);
		}

		function alwaysFilterToKeys(filter) {
			if (filter.length === 0) {
				return [];
			}

			var theFilter = removeDoubleFilter(filter);

			switch (theFilter) {
				case "allfriends":
					return [userService.getown().getFriendsKey()];
				case "everyone":
					//we do not encrypt it anyhow .... this needs to be checked in before!
					throw new Error("should never be here");
				default:
					throw new errors.InvalidFilter("unknown always value");
			}
		}

		function circleFilterToKeys(filter, cb) {
			step(function () {
				circleService.loadAll(this);
			}, h.sF(function () {
				var keys = [], i;
				for (i = 0; i < filter.length; i += 1) {
					keys.push(circleService.get(filter[i]).getKey());
				}
				
				this.ne(keys);
			}), cb);
		}

		function userFilterToKeys(user, cb) {
			step(function () {
				userService.getMultiple(user, this);
			}, h.sF(function (users) {
				var i, keys = [];
				for (i = 0; i < users.length; i += 1) {
					keys.push(users[i].getContactKey());
				}

				this.ne(keys);
			}), cb);
		}

		function userFriendsFilterToKeys(user, cb) {
			step(function () {
				userService.getMultiple(user, this);
			}, h.sF(function (users) {
				var i, keys = [];
				for (i = 0; i < users.length; i += 1) {
					keys.push(users[i].getFriendsKey());
				}

				this.ne(keys);
			}), cb);
		}

		var res = {
			filterToKeys: filterToKeys,

			removeDoubleFilter: removeDoubleFilter,

			circleFilterToKeys: circleFilterToKeys,

			alwaysFilterToKeys: alwaysFilterToKeys,

			userFilterToKeys: userFilterToKeys,
			userFriendsFilterToKeys: userFriendsFilterToKeys
		};

		return res;
	};

	service.$inject = ["ssn.userService", "ssn.circleService"];

	return service;
});