define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($rootScope, User, errorService, initService, socketService, keyStoreService, sessionService) {

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

		var THROTTLE = 20;

		/** loads all the users in the batch */
		function doLoad(identifier, cb) {
			step(function () {
				socketService.emit("user.getMultiple", {identifiers: identifier}, this);
			}, h.sF(function (data) {
				var result = [];
				if (data && data.users) {
					result = data.users.map(function (e) {
						if (e.userNotExisting) {
							return NotExistingUser;
						} else {
							return makeUser(e);
						}
					});
				}

				this.ne(result);
			}), cb);
		}

		var delay = h.delayMultiple(THROTTLE, doLoad);

		function loadUser(identifier, cb) {
			step(function () {
				if (users[identifier]) {
					this.last.ne(users[identifier]);
				} else {
					delay(identifier, this);
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
						}), errorService.criticalError);
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

	service.$inject = ["$rootScope", "ssn.models.user", "ssn.errorService", "ssn.initService", "ssn.socketService", "ssn.keyStoreService", "ssn.sessionService"];

	return service;
});