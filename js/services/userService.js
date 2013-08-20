define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($rootScope, socketService, sessionService, keyStoreService, ProfileService) {

		var NotExistingUser = {
			getName: function (cb) {
				cb("Not Existing User");
			}
		};

		var knownIDs = [];

		var users = {};
		var loading = {};

		var User = function (data) {
			var theUser = this, mainKey, signKey, cryptKey;

			if (data.mainKey) {
				mainKey = keyStoreService.upload.addKey(data.mainKey);
			}

			if (data.signKey) {
				signKey = keyStoreService.upload.addKey(data.signKey);
			}

			if (data.cryptKey) {
				cryptKey = keyStoreService.upload.addKey(data.cryptKey);
			}

			if (data.profile && data.profile.priv && data.profile.priv instanceof Array) {
				var priv = data.profile.priv, i;
				for (i = 0; i < priv.length; i += 1) {
					priv[i] = new ProfileService(priv[i]);
				}
			}

			function getProfileBranch(branch, cb) {
				step(function () {
					var priv = theUser.getPrivateProfiles(), i;

					if (priv) {
						for (i = 0; i < priv.length; i += 1) {
							priv[i].decrypt(this.parallel());
						}
					} else {
						this.ne([]);
					}
				}, h.sF(function (results) {
					for (i = 0; i < results.length; i += 1) {
						if (results[i] && results[i][branch]) {
							this.last.ne(results[i][branch]);
							return;
						}
					}

					var pub = theUser.getProfile();

					if (pub && pub[branch]) {
						this.last.ne(pub[branch]);
						return;
					}

					this.last.ne();
				}), cb);
			}

			function getProfileAttribute(branch, attribute, cb) {
				step(function () {
					var priv = theUser.getPrivateProfiles(), i;

					if (priv) {
						for (i = 0; i < priv.length; i += 1) {
							priv[i].decrypt(this.parallel());
						}
					} else {
						this.ne([]);
					}
				}, h.sF(function (results) {
					for (i = 0; i < results.length; i += 1) {
						if (results[i] && results[i][branch] && results[i][branch][attribute]) {
							this.last.ne(results[i][branch][attribute]);
							return;
						}
					}

					var pub = theUser.getProfile();

					if (pub && pub[branch] && pub[branch][attribute]) {
						this.last.ne(pub[branch][attribute]);
						return;
					}

					this.last.ne();
				}), cb);
			}

			this.isOwn = function () {
				return theUser.getID() === sessionService.getUserID();
			};

			this.getNickOrMail = function () {
				return data.nickname || data.mail;
			};

			this.getMainKey = function () {
				return mainKey;
			};

			this.getSignKey = function () {
				return signKey;
			};

			this.getCryptKey = function () {
				return cryptKey;
			};

			this.getID = function () {
				return parseInt(data.id, 10);
			};

			this.getUrl = function () {
				return "#/user/" + this.getID();
			};

			this.getNickname = function () {
				return data.nickname;
			};

			this.getMail = function () {
				return data.mail;
			};

			this.getProfile = function () {
				return data.profile.pub;
			};

			this.getPrivateProfiles = function () {
				return data.profile.priv;
			};

			this.getImage = function (cb) {
				step(function () {
					getProfileBranch("image", this);
				}, h.sF(function (image) {
					if (image) {
						this.ne(image);
					} else {
						this.ne("img/profil.jpg");
					}
				}), cb);
			};

			this.getShortName = function (cb) {
				step(function getSN1() {
					this.parallel.unflatten();

					getProfileAttribute("basic", "firstname", this.parallel());
					getProfileAttribute("basic", "lastname", this.parallel());
				}, h.sF(function (firstname, lastname) {
					var nickname = theUser.getNickname();

					this.ne(firstname || lastname || nickname || "");
				}), cb);
			};

			this.getName = function (cb) {
				step(function getN1() {
					this.parallel.unflatten();

					getProfileAttribute("basic", "firstname", this.parallel());
					getProfileAttribute("basic", "lastname", this.parallel());
				}, h.sF(function (firstname, lastname) {
					var nickname = theUser.getNickname();

					if (firstname && lastname) {
						this.ne(firstname + " " + lastname);
					} else if (firstname || lastname) {
						this.ne(firstname || lastname);
					} else if (nickname) {
						this.ne(nickname);
					} else {
						this.ne("");
					}
				}), cb);
			};
		};

		function makeUser(data) {
			if (data.error === true) {
				return NotExistingUser;
			}

			var theUser = new User(data);

			var id = theUser.getID();
			var mail = theUser.getMail();
			var nickname = theUser.getNickname();

			if (users[id]) {
				return users[id];
			}

			users[id] = theUser;

			knownIDs.push(id);

			if (mail) {
				users[mail] = theUser;
			}

			if (nickname) {
				users[nickname] = theUser;
			}

			return theUser;
		}

		var api = {
			query: function queryF(query, cb) {
				step(function () {
					socketService.emit("user.search", {
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

			reset: function resetF() {
				users = {};
				loading = {};
			},

			get: function getF(identifier, cb) {
				step(function () {
					if (users[identifier]) {
						this.last.ne(users[identifier]);
					} else {
						socketService.emit("user.get", {identifier: identifier}, this);
					}
				}, h.sF(function (data) {
					if (data.error === true) {
						this.ne(NotExistingUser);
					} else {
						this.ne(makeUser(data));
					}
				}), cb);
			},

			getMultiple: function getMultipleF(identifiers, cb) {
				var existing = [], toLoad = [];
				step(function () {
					var i, id;
					for (i = 0; i < identifiers.length; i += 1) {
						id = identifiers[i];
						if (users[id]) {
							existing.push(users[id]);
						} else {
							toLoad.push(id);
						}
					}

					if (toLoad.length > 0) {
						socketService.emit("user.getMultiple", {identifiers: toLoad}, this);
					} else {
						this.ne();
					}
				}, h.sF(function (data) {
					var result = [];
					if (data && data.users) {
						var i, users = data.users;
						for (i = 0; i < users.length; i += 1) {
							if (users[i].userNotExisting) {
								result.push(NotExistingUser);
							} else {
								result.push(makeUser(users[i]));
							}
						}
					}

					result = result.concat(existing);

					this.ne(result);
				}), cb);
			},

			addFromData: function addFromData(data) {
				return makeUser(data);
			},

			getown: function getownF() {
				return users[sessionService.getUserID()];
			}
		};

		$rootScope.$on("ssn.login", function () {
			if (sessionService.isLoggedin()) {
				step(function () {
					socketService.emit("data", {
						"user": {
							"get": {
								identifier: sessionService.getUserID()
							}
						},
						"messages": {
							"getUnreadCount": {}
						}
					}, this);
				}, function (e, data) {
					if (!e) {
						var user = api.addFromData(data.user.get);

						if (user === NotExistingUser) {
							sessionService.logout();

							return;
						}

						var identifier = user.getNickOrMail();

						keyStoreService.setKeyGenIdentifier(identifier);

						$rootScope.$broadcast("ssn.ownLoaded", data);
					} else {
						console.error(e);
					}
				});
			}
		});

		$rootScope.$on("ssn.reset", function () {
			api.reset();
		});

		return api;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.sessionService", "ssn.keyStoreService", "ssn.profileService"];

	return service;
});