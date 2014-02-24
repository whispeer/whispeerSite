define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($rootScope, User, initService, socketService, keyStoreService, sessionService) {

		var NotExistingUser = {
			getName: function (cb) {
				cb("Not Existing User");
			}
		};

		var knownIDs = [];

		var users = {};
		var loading = {};

		function makeUser(data) {
			if (data.error === true) {
				return NotExistingUser;
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

			return theUser;
		}

		var loadListeners = {};

		var toLoad = [];
		var timer_started = false;
		var THROTTLE = 20;

		/** calls all listeners waiting for users */
		function callListener(listener, arg1) {
			var i;
			for (i = 0; i < listener.length; i += 1) {
				try {
					listener[i](arg1);
				} catch (e) {
					console.log(e);
				}
			}
		}

		/** loads all the users in the batch */
		function doLoad() {
			var loading;
			step(function () {
				loading = toLoad;
				toLoad = [];
				timer_started = false;

				socketService.emit("user.getMultiple", {identifiers: loading}, this);
			}, h.sF(function (data) {
				var result = [], i;
				if (data && data.users) {
					var users = data.users;
					for (i = 0; i < users.length; i += 1) {
						if (users[i].userNotExisting) {
							result.push(NotExistingUser);
						} else {
							result.push(makeUser(users[i]));
						}
					}
				}

				for (i = 0; i < result.length; i += 1) {
					var curIdentifier = loading[i];
					var cur = loadListeners[curIdentifier];

					callListener(cur, result[i]);
					delete loadListeners[curIdentifier];
				}
			}));
		}

		function loadUser(identifier, cb) {
			step(function () {
				if (users[identifier]) {
					this.last.ne(users[identifier]);
				} else if (loadListeners[identifier]) {
					loadListeners[identifier].push(this.ne);
				} else {
					loadListeners[identifier] = [this.ne];
					toLoad.push(identifier);

					if (!timer_started) {
						timer_started = true;

						window.setTimeout(doLoad, THROTTLE);
					}
				}
			}, cb);
		}

		var api = {
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
					api.getMultiple(identifiers, this);
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

			addFromData: function addFromData(data) {
				return makeUser(data);
			},

			/** get own user. synchronous */
			getown: function getownF() {
				return users[sessionService.getUserID()];
			}
		};

		function improvementListener(identifier) {
			var improve = [];
			var improve_timer = false;

			keyStoreService.addImprovementListener(function (rid) {
				improve.push(rid);

				if (!improve_timer) {
					improve_timer = true;
					window.setTimeout(function () {
						step(function () {
							var own = api.getown();
							if (own.getNickOrMail() === identifier) {
								var mainKey = own.getMainKey();

								var i;
								for (i = 0; i < improve.length; i += 1) {
									keyStoreService.sym.symEncryptKey(improve[i], mainKey, this.parallel());
								}
							}
						}, h.sF(function () {
							var toUpload = keyStoreService.upload.getDecryptors(improve);
							console.log(toUpload);
							socketService.emit("key.addFasterDecryptors", {
								keys: toUpload
							}, this);
						}), h.sF(function (result) {
							improve_timer = false;
							console.log(result);
						}), function (e) {
							if (e) {
								console.log(e);
							}
						});
					}, 5000);
				}
			});
		}

		initService.register("user.get", function () {
			return {identifier: sessionService.getUserID()};
		}, function (data) {
			var user = api.addFromData(data);

			var identifier = user.getNickOrMail();

			keyStoreService.setKeyGenIdentifier(identifier);
			improvementListener(identifier);
		});

		$rootScope.$on("ssn.reset", function () {
			api.reset();
		});

		return api;
	};

	service.$inject = ["$rootScope", "ssn.models.user", "ssn.initService", "ssn.socketService", "ssn.keyStoreService", "ssn.sessionService"];

	return service;
});