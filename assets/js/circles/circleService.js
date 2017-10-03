/**.
* MessageService
**/

const h = require("../helper/helper").default;
const Observer = require("asset/observer");
const SecuredData = require("asset/securedDataWithMetaData");
const Bluebird = require("bluebird");

const socket = require("services/socket.service").default;
const keyStore = require("services/keyStore.service").default;
const initService = require("services/initService");

const settingsService = require("services/settings.service").default;

const friendsService = require("services/friendsService");

var circles = {};
var circleArray = [];
var circleData = [];

function encryptKeyForUsers(key, users, cb) {
	return Bluebird.resolve(users).map(h.parseDecimal).map(function (userID) {
		if (!friendsService.getUserFriendShipKey(userID)) {
			throw new Error("no friend key for user: " + userID);
		}

		return friendsService.getUserFriendShipKey(userID);
	}).map(function (friendKey) {
		return keyStore.sym.symEncryptKey(key, friendKey).thenReturn(friendKey);
	}).nodeify(cb);
}

function generateNewKey(cb) {
	return keyStore.sym.generateKey(null, "CircleKey").then(function (key) {
		const userService = require("users/userService").default;
		const mainKey = userService.getOwn().getMainKey();

		return keyStore.sym.symEncryptKey(key, mainKey).thenReturn(key);
	}).nodeify(cb);
}

var Circle = function (data) {
	var id = data.id, theCircle = this, persons = [];

	var circleSec = SecuredData.load(data.content, data.meta, { type: "circle" });
	var circleUsers = circleSec.metaAttr("users").map(h.parseDecimal);

	this.getID = function getIDF() {
		return id;
	};

	this.getUserIDs = function () {
		return circleUsers;
	};

	this.hasUser = function (uid) {
		return circleUsers.indexOf(h.parseDecimal(uid)) !== -1;
	};

	this.getKey = function () {
		return circleSec.metaAttr("circleKey");
	};

	this.remove = function (cb) {
		return settingsService.privacy.removeCircle().then(function () {
			return socket.emit("circle.delete", {
				remove: {
					circleid: id
				}
			});
		}).then(function () {
			var circle = circles[id];
			delete circles[id];
			h.removeArray(circleArray, circle);
			h.removeArray(circleData, circle.data);
		}).nodeify(cb);
	};

	this.setUser = function (uids, cb) {
		var newKey, oldKey = circleSec.metaAttr("circleKey"), removing = false, friendKeys;

		return Bluebird.try(function () {
			uids = uids.map(h.parseDecimal);
			removing = h.arraySubtract(circleUsers, uids).length > 0;

			if (removing) {
				return generateNewKey();
			}

			return oldKey;
		}).then(function (_newKey) {
			newKey = _newKey;

			if (removing) {
				return keyStore.sym.symEncryptKey(oldKey, newKey).thenReturn(newKey);
			}

			return newKey;
		}).then(function (newKey) {
			if (removing) {
				return encryptKeyForUsers(newKey, uids);
			} else {
				return encryptKeyForUsers(newKey, h.arraySubtract(uids, circleUsers));
			}
		}).then(function (_friendKeys) {
			friendKeys = _friendKeys;
			circleSec.metaSet({
				users: uids,
				circleKey: newKey
			});

			const userService = require("users/userService").default;
			return circleSec.getUpdatedData(userService.getOwn().getSignKey());
		}).then(function (newData) {
			var update = {
				id: id,
				content: newData.content,
				meta: newData.meta
			};

			if (removing) {
				update.decryptors = keyStore.upload.getDecryptors([oldKey], [newKey]);
				update.key = keyStore.upload.getKey(newKey);
			} else {
				update.decryptors = keyStore.upload.getDecryptors([newKey], friendKeys);
			}

			return socket.emit("circle.update", { update: update });
		}).then(function () {
			//emit
			circleUsers = uids;
			persons = persons.filter(function (user) {
				return uids.indexOf(user.id) > -1;
			});
			theCircle.data.persons = persons;
			theCircle.data.userids = circleUsers;

			if (removing) {
				const userService = require("users/userService").default;
				var ownUser = userService.getOwn();

				//rebuild profiles
				return ownUser.uploadChangedProfile();
			}
		}).then(function () {
			return theCircle.loadPersons();
		}).nodeify(cb);
	};

	this.removePersons = function (uids, cb) {
		uids = uids.map(h.parseDecimal).filter(function (e) {
			return circleUsers.indexOf(e) > -1;
		});

		var users = circleUsers.filter(function (e) {
			return uids.indexOf(e) === -1;
		});

		this.setUser(users, cb);
	};

	this.addPersons = function (uids, cb) {
		return Bluebird.resolve(uids).bind(this).filter(function(uid) {
			return circleUsers.indexOf(uid) === -1;
		}).then(function(uids) {
			this.setUser(uids.concat(circleUsers), cb);
		});
	};

	this.load = function (cb) {
		const userService = require("users/userService").default;
		return Bluebird.all([
			circleSec.decrypt(),
			circleSec.verify(userService.getOwn().getSignKey(), undefined, id)
		]).spread(function (content) {
			keyStore.security.addEncryptionIdentifier(circleSec.metaAttr("circleKey"));
			theCircle.data.name = content.name;
		}).nodeify(cb);
	};

	this.loadPersons = function (cb, limit) {
		limit = limit || 20;
		limit = Math.min(h.parseDecimal(limit), 20);

		if (persons.length >= circleUsers.length) {
			return Bluebird.resolve().nodeify(cb);
		}

		return Bluebird.try(function () {
			var loadedIDs = persons.map(function (p) { return p.id; });
			var loadableUsers = circleUsers.filter(function (user) {
				return loadedIDs.indexOf(user) === -1;
			});

			const userService = require("users/userService").default;

			return userService.getMultiple(loadableUsers.slice(0, limit));
		}).map(function (user) {
			persons.push(user.data);

			return user.loadBasicData().thenReturn(user)
		}).nodeify(cb);
	};

	this.data = {
		id: id,
		userids: circleUsers,
		name: "",
		image: "assets/img/circle.png",
		persons: persons
	};

	Observer.extend(this);
};

var loadingPromise;

function makeCircle(data) {
	var circle = new Circle(data);
	var id = circle.getID();

	if (circles[id]) {
		return;
	}

	circles[id] = circle;
	circleArray.push(circle);
	circleData.push(circle.data);

	return circle;
}

var circleService = {
	data: {
		loaded: false,
		loading: false,
		circles: circleData
	},
	get: function (id) {
		return circles[id];
	},
	inWhichCircles: function (uid) {
		uid = h.parseDecimal(uid);

		return circleArray.filter(function (circle) {
			return circle.hasUser(uid);
		});
	},
	create: function (name, users) {
		users = (users || []).map(h.parseDecimal);

		return generateNewKey().then(function (symKey) {
			return encryptKeyForUsers(symKey, users).then(function () {
				const userService = require("users/userService").default;
				var own = userService.getOwn();
				var mainKey = own.getMainKey();

				return SecuredData.createAsync({ name: name }, {
					users: users,
					circleKey: symKey
				}, { type: "circle" }, own.getSignKey(), mainKey);
			}).then(function (circleData) {
				var keyData = keyStore.upload.getKey(symKey);

				return socket.emit("circle.create", {
					circle: {
						key: keyData,
						content: circleData.content,
						meta: circleData.meta
					}
				});
			}).then(function (circleResponse) {
				var theCircle = makeCircle(circleResponse.created);
				return theCircle.load().thenReturn(theCircle);
			});
		});
	},
	reset: function () {
		circles = {};
		circleArray = [];
		circleData = [];

		circleService.data.circles = circleData;

		circleService.data.loading = false;
		circleService.data.loaded = false;
	},
	loadAll: function (cb) {
		if (!loadingPromise) {
			loadingPromise = Bluebird.try(function () {
				circleService.data.loading = false;

				return initService.awaitLoading();
			}).then(function () {
				return socket.definitlyEmit("circle.all", {});
			}).then(function (data) {
				if (data.circles) {
					return data.circles;
				} else {
					throw new Error("server did not return circles");
				}
			}).map(function (circleData) {
				var circle = makeCircle(circleData);
				return Bluebird.fromCallback(function (cb) {
					circle.load(cb);
				});
			}).then(function () {
				circleService.data.loading = false;
				circleService.data.loaded = true;
				circleService.notify("", "loaded");
			});
		}

		return loadingPromise.nodeify(cb);
	}
};

Observer.extend(circleService);

module.exports = circleService;
