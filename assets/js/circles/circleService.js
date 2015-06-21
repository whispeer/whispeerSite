/**.
* MessageService
**/
define(["step", "whispeerHelper", "asset/observer", "services/serviceModule", "asset/securedDataWithMetaData"], function (step, h, Observer, serviceModule, SecuredData) {
	"use strict";

	var service = function ($rootScope, socket, userService, friendsService, sessionService, keyStore, settingsService) {
		var circles = {};
		var circleArray = [];
		var circleData = [];

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
				step(function () {
					//remove from settings
					settingsService.privacy.removeCircle(id, this);
				}, h.sF(function () {
					//then delete from server
					socket.emit("circle.delete", {
						remove: {
							circleid: id
						}
					}, this);
				}), h.sF(function () {
					var circle = circles[id];
					delete circles[id];
					h.removeArray(circleArray, circle);
					h.removeArray(circleData, circle.data);

					this.ne();
				}), cb);
			};

			this.setUser = function (uids, cb) {
				var newKey, oldKey = circleSec.metaAttr("circleKey"), removing = false, friendKeys;

				step(function () {
					uids = uids.map(h.parseDecimal);
					removing = h.arraySubtract(circleUsers, uids).length > 0;

					if (removing) {
						generateNewKey(this);
					} else {
						this.ne(oldKey);
					}
				}, h.sF(function (_newKey) {
					newKey = _newKey;

					this.parallel.unflatten();
					if (removing) {
						encryptKeyForUsers(newKey, uids, this.parallel());
						keyStore.sym.symEncryptKey(oldKey, newKey, this.parallel());
					} else {
						encryptKeyForUsers(newKey, h.arraySubtract(uids, circleUsers), this.parallel());
					}
				}), h.sF(function (_friendKeys) {
					friendKeys = _friendKeys;
					circleSec.metaSet({
						users: uids,
						circleKey: newKey
					});

					this.parallel.unflatten();
					circleSec.getUpdatedData(userService.getown().getSignKey(), this);
				}), h.sF(function (newData) {
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

					socket.emit("circle.update", { update: update }, this);
				}), h.sF(function () {
					//emit
					circleUsers = uids;
					persons = persons.filter(function (user) {
						return uids.indexOf(user.id) > -1;
					});
					theCircle.data.persons = persons;
					theCircle.data.userids = circleUsers;

					if (removing) {
						//rebuild profiles
						userService.getown().uploadChangedProfile(this);
					} else {
						this.ne();
					}
				}), h.sF(function () {
					theCircle.loadPersons(this);
				}), cb);
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
				uids = uids.filter(function (u) {
					return circleUsers.indexOf(u) === -1;
				});

				this.setUser(uids.concat(circleUsers), cb);
			};

			this.load = function (cb) {
				step(function () {
					this.parallel.unflatten();

					circleSec.decrypt(this.parallel());
					circleSec.verify(userService.getown().getSignKey(), this.parallel());
				}, h.sF(function (content) {
					keyStore.security.addEncryptionIdentifier(circleSec.metaAttr("circleKey"));
					theCircle.data.name = content.name;

					this.ne();
				}), cb);
			};

			this.loadPersons = function (cb, limit) {
				limit = limit || 20;
				limit = Math.min(h.parseDecimal(limit), 20);

				if (persons.length < circleUsers.length) {
					step(function () {
						var loadedIDs = persons.map(function (p) { return p.id; });
						var loadableUsers = circleUsers.filter(function (user) {
							return loadedIDs.indexOf(user) === -1
						});

						userService.getMultiple(loadableUsers.slice(0, limit), this);
					}, h.sF(function (users) {
						users.forEach(function (user) {
							persons.push(user.data);
							user.loadBasicData(this.parallel());
						}, this);
					}), h.sF(function () {
						this.ne(persons);
					}), cb);
				} else {
					cb();
				}
			};

			this.data = {
				id: id,
				userids: circleUsers,
				name: "",
				image: "assets/img/circle.png",
				persons: persons
			};

			Observer.call(this);
		};

		var loaded = false, loading = false;

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

		function encryptKeyForUsers(key, users, cb) {
			users = users.map(h.parseDecimal);
			var keys;
			step(function () {
				if (users && users.length > 0) {
					this.ne();
				} else {
					this.last.ne([]);
				}
			}, h.sF(function () {
				users.forEach(function (user) {
					if (!friendsService.getUserFriendShipKey(user)) {
						throw new Error("no friend key for user: " + user);
					}
				});

				keys = users.map(function (user) {
					return friendsService.getUserFriendShipKey(user);
				});

				keys.forEach(function (friendKey) {
					keyStore.sym.symEncryptKey(key, friendKey, this.parallel());
				}, this);
			}), h.sF(function () {
				this.ne(keys);
			}), cb);
		}

		function generateNewKey(cb) {
			var key;
			step(function () {
				keyStore.sym.generateKey(this, "CircleKey");
			}, h.sF(function (_key) {
				key = _key;
				keyStore.sym.symEncryptKey(key, userService.getown().getMainKey(), this);
			}), h.sF(function () {
				this.ne(key);
			}), cb);
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
			create: function (name, cb, users) {
				var key, theCircle;
				users = (users || []).map(h.parseDecimal);
				step(function () {
					generateNewKey(this);
				}, h.sF(function (symKey) {
					key = symKey;
					encryptKeyForUsers(key, users, this);
				}), h.sF(function () {
					var own = userService.getown();
					var mainKey = own.getMainKey();

					SecuredData.create({ name: name }, {
						users: users,
						circleKey: key
					}, { type: "circle" }, own.getSignKey(), mainKey, this);
				}), h.sF(function (data) {
					var keyData = keyStore.upload.getKey(key);

					socket.emit("circle.create", {
						circle: {
							key: keyData,
							content: data.content,
							meta: data.meta
						}
					}, this);
				}), h.sF(function (data) {
					theCircle = makeCircle(data.created);
					theCircle.load(this);
				}), h.sF(function () {
					this.ne(theCircle);
				}), cb);
			},
			reset: function () {
				circles = {};
				circleArray = [];
				circleData = [];

				circleService.data.circles = circleData;

				loaded = false;
				loading =  false;

				circleService.data.loading = false;
				circleService.data.loaded = false;
			},
			loadAll: function (cb) {
				step(function () {
					if (!loaded && !loading) {
						loading = true;
						circleService.data.loading = false;

						socket.emit("circle.all", {}, this);
					} else if (loaded) {
						this.last.ne();
					} else {
						circleService.listen(function () {
							cb();
						}, "loaded");
					}
				}, h.sF(function (data) {
					if (data.circles) {
						data.circles.forEach(function (circle) {
							var c = makeCircle(circle);
							c.load(this.parallel());
						}, this);

						this.parallel()();
					} else {
						throw new Error("server did not return circles");
					}
				}), h.sF(function () {
					loading = false;
					loaded = true;

					circleService.data.loading = false;
					circleService.data.loaded = true;
					circleService.notify("", "loaded");

					this.ne();
				}), cb);
			}
		};

		Observer.call(circleService);

		$rootScope.$on("ssn.reset", function () {
			circleService.reset();
		});

		return circleService;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.userService", "ssn.friendsService", "ssn.sessionService", "ssn.keyStoreService", "ssn.settingsService"];

	serviceModule.factory("ssn.circleService", service);
});
