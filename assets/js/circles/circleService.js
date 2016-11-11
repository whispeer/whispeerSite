/**.
* MessageService
**/
define(["step", "whispeerHelper", "asset/observer", "services/serviceModule", "asset/securedDataWithMetaData", "bluebird"], function (step, h, Observer, serviceModule, SecuredData, Bluebird) {
	"use strict";

	var service = function ($rootScope, socket, userService, friendsService, sessionService, keyStore, settingsService, initService) {
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
				var mainKey = userService.getown().getMainKey();

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
				return Bluebird.all([
					circleSec.decrypt(),
					circleSec.verify(userService.getown().getSignKey(), undefined, id)
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

					return userService.getMultiple(loadableUsers.slice(0, limit));
				}).map(function (user) {
					persons.push(user.data);
					return Bluebird.fromCallback(function (cb) {
						user.loadBasicData(cb);
					}).thenReturn(user);
				}).nodeify(cb);
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

		var loaded = false, loading = false, loadingPromise;

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
						var own = userService.getown();
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

				loaded = false;
				loading =  false;

				circleService.data.loading = false;
				circleService.data.loaded = false;
			},
			loadAll: function (cb) {
				if (!loadingPromise) {
					loadingPromise = Bluebird.try(function () {
						loading = true;
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
						loading = false;
						loaded = true;

						circleService.data.loading = false;
						circleService.data.loaded = true;
						circleService.notify("", "loaded");
					});
				}

				return loadingPromise.nodeify(cb);
			}
		};

		Observer.call(circleService);

		$rootScope.$on("ssn.reset", function () {
			circleService.reset();
		});

		return circleService;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.userService", "ssn.friendsService", "ssn.sessionService", "ssn.keyStoreService", "ssn.settingsService", "ssn.initService"];

	serviceModule.factory("ssn.circleService", service);
});
