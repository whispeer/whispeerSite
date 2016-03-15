define(["step", "whispeerHelper", "user/userModule", "asset/observer", "crypto/signatureCache", "bluebird"], function (step, h, userModule, Observer, signatureCache, Bluebird) {
	"use strict";

	var service = function ($rootScope, User, errorService, initService, socketService, keyStoreService, sessionService) {
		var userService, knownIDs = [], users = {}, loading = {}, ownUserStatus = {};

		ownUserStatus.verifyOwnKeysDone = new Bluebird(function (resolve) {
			ownUserStatus.verifyOwnKeysDoneResolve = resolve;
		});

		ownUserStatus.loaded = new Bluebird(function (resolve) {
			ownUserStatus.loadedResolve = resolve;
		});

		var name = "Deleted user"; //localize("user.deleted", {});
		var NotExistingUser = function (identifier) {
			this.data = {
				trustLevel: -1,
				notExisting: true,
				basic: {
					shortname: name,
					image: "assets/img/user.png"
				},
				name: name,
				user: this
			};

			if (typeof identifier === "number") {
				this.data.id = identifier;
			}

			this.isNotExistingUser = function () {
				return true;
			};

			this.loadBasicData = function (cb) {
				cb();
			};

			this.isOwn = function () {
				return false;
			};
		};

		function makeUser(data) {
			if (data.error === true) {
				return new NotExistingUser();
			}

			var theUser = new User(data);

			var id = theUser.getID();
			var mail = theUser.getMail();
			var nickname = theUser.getNickname();

			if (users[id]) {
				theUser.update(data);
				return users[id];
			}

			if (!users[id]) {
				knownIDs.push(id);
			}

			users[id] = theUser;

			if (mail) {
				users[mail] = theUser;
			}

			if (nickname) {
				users[nickname] = theUser;
			}

			userService.notify(theUser, "loadedUser");

			return theUser;
		}

		var THROTTLE = 20;

		/** loads all the users in the batch */
		function doLoad(identifier, cb) {
			var result = [];
			step(function () {
				socketService.emit("user.getMultiple", {identifiers: identifier}, this);
			}, h.sF(function (data) {
				if (data && data.users) {
					result = data.users.map(function (e) {
						if (e.userNotExisting) {
							return new NotExistingUser(e.identifier);
						} else {
							return makeUser(e);
						}
					});
				}

				result.forEach(function (u) {
					if (!u.isNotExistingUser()) {
						u.verifyKeys(this.parallel());
					}
				}, this);

				this.parallel()();
			}), h.sF(function () {
				this.ne(result);
			}), cb);
		}

		var delay = h.delayMultiple(THROTTLE, doLoad, 5);

		function loadUser(identifier, cb) {
			step(function () {
				if (users[identifier]) {
					this.last.ne(users[identifier]);
				} else {
					delay(identifier, this);
				}
			}, cb);
		}

		userService = {
			/** search your friends */
			queryFriends: function queryFriendsF(query, cb) {
				step(function () {
					socketService.emit("user.searchFriends", {
						text: query,
						known: knownIDs
					}, this);
				}, h.sF(function (data) {
					var result = [], user = data.results;

					var i;
					for (i = 0; i < user.length; i += 1) {
						if (typeof user[i] === "object") {
							result.push(makeUser(user[i]));
						} else {
							result.push(users[user[i]]);
						}
					}

					this.ne(result);
				}), cb);
			},

			/** search for a user
			* @param query query string to search for
			* @param cb user objects
			*/
			query: function queryF(query, cb) {
				step(function () {
					socketService.emit("user.search", {
						text: query,
						known: knownIDs
					}, this);
				}, h.sF(function (data) {
					var result = [], user = data.results;

					if (user) {
						var i;
						for (i = 0; i < user.length; i += 1) {
							if (typeof user[i] === "object") {
								result.push(makeUser(user[i]));
							} else {
								result.push(users[user[i]]);
							}
						}
					}

					this.ne(result);
				}), cb);
			},

			reset: function resetF() {
				users = {};
				knownIDs = [];
				loading = {};
			},

			/** load a user
			* @param identifier identifier of the user (id, nickname or mail)
			* @param cb called with results
			* this function is asynchronous and returns immediatly. requests are also batched.
			*/
			get: function getF(identifier, cb) {
				step(function () {
					loadUser(identifier, this);
				}, cb);
			},

			/** load a user
			* @param identifiers identifier array of the users (id, nickname or mail)
			* @param cb called with results
			* this function is asynchronous and returns immediatly. requests are also batched.
			*/
			getMultiple: function getMultipleF(identifiers, cb) {
				step(function () {
					var i;
					for (i = 0; i < identifiers.length; i += 1) {
						loadUser(identifiers[i], this.parallel());
					}

					if (identifiers.length === 0) {
						this.ne([]);
					}
				}, cb);
			},

			/** gets multiple users and loads their basic data.
			* @param identifiers identifier of users to load
			* @param cb called with users data.
			*/
			getMultipleFormatted: function getMFF(identifiers, cb) {
				var theUsers;
				step(function () {
					userService.getMultiple(identifiers, this);
				}, h.sF(function (user) {
					theUsers = user;
					var i;
					for (i = 0; i < user.length; i += 1) {
						user[i].loadBasicData(this.parallel());
					}

					if (user.length === 0) {
						this.ne([]);
					}
				}), h.sF(function () {
					var i, result = [];
					for (i = 0; i < theUsers.length; i += 1) {
						result.push(theUsers[i].data);
					}

					this.ne(result);
				}), cb);
			},

			verifyOwnKeysDone: function () {
				return ownUserStatus.verifyOwnKeysDone;
			},

			ownLoaded: function () {
				return ownUserStatus.loaded;
			},

			/** get own user. synchronous */
			getown: function getownF() {
				return users[sessionService.getUserID()];
			}
		};

		function improvementListener(identifier) {
			var improve = [];

			keyStoreService.addImprovementListener(function (rid) {
				improve.push(rid);

				if (improve.length === 1) {
					step(function () {
						window.setTimeout(this.ne, 5000);
					}, h.sF(function () {
						var own = userService.getown();
						if (own && own.getNickOrMail() === identifier) {
							improve.forEach(function (keyID) {
								keyStoreService.sym.symEncryptKey(keyID, own.getMainKey(), this.parallel());
							}, this);
						}
					}), h.sF(function () {
						var toUpload = keyStoreService.upload.getDecryptors(improve);
						socketService.emit("key.addFasterDecryptors", {
							keys: toUpload
						}, this);
					}), h.sF(function () {
						improve = [];
					}), errorService.criticalError);
				}
			});
		}

		Observer.call(userService);

		initService.get("user.get", function () {
			return sessionService.getUserID();
		}, function (data, cb) {
			var user;
			step(function () {
				user = makeUser(data);

				var identifier = user.getNickOrMail();

				keyStoreService.setKeyGenIdentifier(identifier);
				improvementListener(identifier);
				keyStoreService.sym.registerMainKey(user.getMainKey());

				user.verifyOwnKeys();

				ownUserStatus.verifyOwnKeysDoneResolve();
				delete ownUserStatus.verifyOwnKeysDoneResolve;

				step.unpromisify(signatureCache.awaitLoading(), this);
			}, h.sF(function () {
				user.verifyKeys(this);
			}), h.sF(function () {
				ownUserStatus.loadedResolve();
				delete ownUserStatus.loadedResolve;

				this.ne();
			}), cb);
		});

		$rootScope.$on("ssn.reset", function () {
			userService.reset();
		});

		return userService;
	};

	service.$inject = ["$rootScope", "ssn.models.user", "ssn.errorService", "ssn.initService", "ssn.socketService", "ssn.keyStoreService", "ssn.sessionService"];

	userModule.factory("ssn.userService", service);
});
