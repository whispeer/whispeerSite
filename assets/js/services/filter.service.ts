import * as Bluebird from "bluebird";
const errors = require("../asset/errors.js");

import keyStore from "./keyStore.service";

const circleService = require("circles/circleService");

const localize = require("i18n/localizationConfig");

class FilterService {
	private alwaysAvailableFilter = ["allfriends"];

	alwaysFilterToKey(filter: any) {
		const userService = require("../users/userService").default;

		switch (filter) {
			case "allfriends":
				return userService.getOwn().getFriendsKey();
			case "everyone":
				//we do not encrypt it anyhow .... this needs to be checked in before!
				throw new Error("should never be here");
			default:
				throw new errors.InvalidFilter("unknown always value");
		}
	}

	circleFilterToKey(filter: any) {
		return Bluebird.try(() => {
			return circleService.loadAll();
		}).then(() => {
			return circleService.get(filter).getKey();
		});
	}

	userFilterToKey(user: any) {
		return Bluebird.try(() => {
			const userService = require("../users/userService").default;
			return userService.get(user);
		}).then((user) => {
			return user.getContactKey();
		});
	}

	friendsFilterToKey(user: any) {
		return Bluebird.try(() => {
			const userService = require("../users/userService").default;
			return userService.get(user);
		}).then((user) => {
			return user.getFriendsKey();
		});
	}

	public filterToKeys(filters: any, cb?: any) {
		return Bluebird.try(() => {
			const userService = require("../users/userService").default;

			var filterPromises = filters.map((filter: any) => {
				var map = filter.split(":");

				switch(map[0]) {
					case "friends":
						return this.friendsFilterToKey(map[1]);
					case "always":
						return this.alwaysFilterToKey(map[1]);
					case "circle":
						return this.circleFilterToKey(map[1]);
					case "user":
						return this.userFilterToKey(map[1]);
					default:
						throw new errors.InvalidFilter("unknown group");
				}
			});

			filterPromises.push(userService.getOwn().getMainKey());

			return Bluebird.all(filterPromises);
		}).nodeify(cb);
	}

	public getCircleByID(id: any) {
		return circleService.loadAll().then(() => {
			var circle = circleService.get(id).data;
			return {
				name: circle.name,
				id: "circle:" + circle.id,
				sref: "app.circles.show({circleid: " + circle.id + "})",
				count: circle.userids.length
			};
		});
	}

	getFriendsFilterByID(id: any) {
		const userService = require("../users/userService").default;
		return userService.get(id).then((user: any) => {
			return {
				name: localize.getLocalizedString("directives.friendsOf", {name: user.data.name}),
				id: "friends:" + user.data.id,
				sref: "app.user({identifier: " + user.data.id + "})"
			};
		});
	}

	public getAlwaysByID(id: any) {
		const userService = require("../users/userService").default;
		if (id !== "allfriends") {
			throw new Error("Invalid Always id");
		}

		var key = userService.getOwn().getFriendsKey();

		return {
			name: localize.getLocalizedString("directives.allfriends"),
			id: "always:" + id,
			sref: "app.friends",
			count: keyStore.upload.getKeyAccessCount(key) - 1
		};
	}

	public getFilterByID(id: any) {
		return Bluebird.try(() => {
			var colon = id.indexOf(":");
			var domain = id.substr(0, colon + 1);
			var domainID = id.substr(colon + 1);

			if (domain === "always:") {
				return this.getAlwaysByID(domainID);
			} else if (domain === "circle:") {
				return this.getCircleByID(domainID);
			} else if (domain === "friends:") {
				return this.getFriendsFilterByID(domainID);
			}
		});
	}

	public getFiltersByID = (ids: any) => {
		return Bluebird.resolve(ids).map(this.getFilterByID.bind(this));
	}

	public getAllFilters() {
		var alwaysAvailable = this.alwaysAvailableFilter.map((e) => {
			return this.getAlwaysByID(e);
		});

		return circleService.loadAll().then(() => {
			var circles = circleService.data.circles;

			var circle = circles.map((e: any) => {
				return {
					name: e.name,
					id: "circle:" + e.id,
					count: e.userids.length
				};
			});

			return alwaysAvailable.concat(circle);
		});
	}
}

export default new FilterService();
