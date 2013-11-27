/**
* MessageService
**/
define(["step", "whispeerHelper", "asset/observer"], function (step, h, Observer) {
	"use strict";

	var service = function ($rootScope, socket, userService, keyStore) {
		var circles = {};
		var circleArray = [];
		var circleData = [];

		var Circle = function (data) {
			var id = data.id, user = data.user.map(h.parseDecimal), name = data.name, decrypted = false, theCircle = this, persons = [];
			var decryptedName, key, usersLoaded = 0;

			if (typeof data.key === "object") {
				key = keyStore.upload.addKey(data.key);
			} else {
				key = data.key;
			}

			this.getID = function getIDF() {
				return id;
			};

			this.getUserIDs = function () {
				return user;
			};

			this.hasUser = function (uid) {
				return user.indexOf(h.parseDecimal(uid)) !== -1;
			};

			this.removePersons = function (uids, cb) {
				var newUser, userIDs;
				step(function () {
					uids = uids.map(h.parseDecimal).filter(function (e) {
						user.indexOf(e) > -1;
					});

					newUser = user.filter(function (e) {
						return uids.indexOf(e) === -1;
					});

					generateUsersSpecificData(newUser, this);
				}, h.sF(function (key, userids) {
					userIDs = userids;
					var mainKey = userService.getown().getMainKey();

					keyStore.sym.symEncryptKey(key, mainKey, this);
				}), h.sF(function (encrypted) {
					var keyData = keyStore.upload.getKey(key);

					socket.emit("circles.removeUsers", {
						circle: {
							key: keyData,
							remove: uids,
							user: userIDs,
							name: JSON.stringify(encrypted)
						}
					}, this);
				}), cb);
			};

			this.addPersons = function (uids, cb) {
				var friendShipKeys = [], userids = [];
				step(function () {
					userService.getMultiple(uids, this);
				}, h.sF(function (otherUsers) {
					var i, u, friendShipKey;

					for (i = 0; i < otherUsers.length; i += 1) {
						u = otherUsers[i];
						friendShipKey = u.getFriendShipKey();
						if (friendShipKey && user.indexOf(u.getID()) === -1) {
							keyStore.sym.symEncryptKey(key, friendShipKey, this);
							userids.push(u.getID());
							friendShipKeys.push(friendShipKey);
						} else {
							throw "no friendShipKey";
						}
					}
				}), h.sF(function () {
					var decryptors = keyStore.upload.getDecryptors([key], friendShipKeys);

					h.assert(decryptors[key].length === userids.length);

					var data = {
						decryptors: decryptors,
						circleid: id,
						userids: userids
					};

					socket.emit("circles.addUsers", {
						add: data
					});
				}), h.sF(function (result) {
					var i;
					if (!result.error && result.added) {
						for (i = 0; i < userids.length; i += 1) {
							if (user.indexOf(userids[i]) === -1) {
								user.push(userids[i]);
							}
						}
					}
					
					theCircle.notify(userids, "usersAdded");

					this.ne();
				}), cb);
			};

			this.decrypt = function (cb) {
				step(function () {
					if (!decrypted) {
						var own = userService.getown();
						var mainKey = own.getMainKey();

						keyStore.sym.decrypt(JSON.parse(name), mainKey, this);
						decrypted = true;
					}
				}, h.sF(function (name) {
					decryptedName = name;
					theCircle.data.name = name;

					this.ne();
				}), cb);
			};

			this.loadPersons = function (cb, limit) {
				var theUsers;
				limit = limit || 20;
				limit = Math.min(h.parseDecimal(limit), 20);

				if (usersLoaded < user.length) {
					step(function () {
						var end = Math.min(user.length, usersLoaded + limit);
						var nextLoad = user.slice(usersLoaded, end);

						usersLoaded = end;

						userService.getMultiple(nextLoad, this);
					}, h.sF(function (users) {
						theUsers = users;
						var i;
						for (i = 0; i < user.length; i += 1) {
							users[i].loadBasicData(this.parallel());
						}
					}), h.sF(function () {
						var i;
						for (i = 0; i < theUsers.length; i += 1) {
							persons.push(theUsers[i].data.basic);
						}

						this.ne(persons);
					}), cb);
				} else {
					cb(0);
				}
			};

			this.data = {
				id: id,
				userids: data.user,
				name: "",
				image: "/assets/img/user.png",
				persons: persons
			};

			Observer.call(this);
		};

		/*socket.listen("circle", function (e, data) {
			if (!e) {

			} else {
				console.error(e);
			}
		});*/

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

		function generateUsersSpecificData(users, cb) {
			var key, userIDs = [];
			step(function () {
				keyStore.sym.generateKey(this, "CircleKey");
			}, h.sF(function (symKey) {
				if (users) {
					key = symKey;
					userService.getMultiple(users, this);
				} else {
					this.last.ne(symKey, []);
				}
			}), h.sF(function (userObjects) {
				var i, friendKey;

				for (i = 0; i < userObjects.length; i += 1) {
					friendKey = userObjects[i].getFriendShipKey();
					if (key) {
						keyStore.sym.symEncryptKey(key, friendKey, this.parallel());
						userIDs.push(userObjects[i].getID());
					}
				}

				this.parallel()();
			}), h.sF(function () {
				this.ne(key, userIDs);
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
				var i, result = [];
				for (i = 0; i  < circleArray.length; i += 1) {
					if (circleArray[i].hasUser(parseInt(uid, 10))) {
						result.push(circleArray[i]);
					}
				}

				return result;
			},
			remove: function (id, cb) {
				//TODO
			},
			create: function (name, cb, users) {
				var key, theCircle, userIDs;
				step(function () {
					generateUsersSpecificData(users, this);
				}, h.sF(function (symKey, users) {
					key = symKey;
					userIDs = users;

					var own = userService.getown();
					var mainKey = own.getMainKey();

					this.parallel.unflatten();

					keyStore.sym.encrypt(name, mainKey, this.parallel());
					keyStore.sym.symEncryptKey(key, mainKey, this.parallel());
				}), h.sF(function (encrypted) {
					var keyData = keyStore.upload.getKey(key);

					socket.emit("circles.add", {
						circle: {
							key: keyData,
							user: userIDs,
							name: JSON.stringify(encrypted)
						}
					}, this);
				}), h.sF(function (data) {
					theCircle = makeCircle(data.result);
					theCircle.decrypt(this);
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

						socket.emit("circles.getAll", {
							fullKey: true
						}, this);
					} else {
						this.last.ne();
					}
				}, h.sF(function (data) {
					var i, c;
					if (data.circles) {
						for (i = 0; i < data.circles.length; i += 1) {
							c = makeCircle(data.circles[i]);
							c.decrypt(this.parallel());
						}

						this.parallel()();
					} else {
						//TO-DO handle error
					}
				}), h.sF(function () {
					circleService.data.loading = false;
					circleService.data.loaded = true;
					loaded = true;

					this.ne();
				}), cb);
			}
		};

		$rootScope.$on("ssn.reset", function () {
			circleService.reset();
		});

		return circleService;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.userService", "ssn.keyStoreService"];

	return service;
});