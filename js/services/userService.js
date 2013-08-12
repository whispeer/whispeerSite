define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($rootScope, socketService, sessionService, keyStoreService, ProfileService) {

		var NotExistingUser = {
			getName: function (cb) {
				cb("Not Existing User");
			}
		};

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
					this.ne("img/profil.jpg");
				}, cb);
			};

			this.getName = function (cb) {
				var firstname, lastname, nickname;
				step(function getN1() {
					var pub = theUser.getProfile().basic;

					if (pub) {
						firstname = pub.firstname;
						lastname = pub.lastname;
					}

					nickname = theUser.getNickname();

					var priv = theUser.getPrivateProfiles(), i;

					if (priv) {
						for (i = 0; i < priv.length; i += 1) {
							priv[i].decrypt(this.parallel());
						}
					} else {
						this.ne([]);
					}
				}, h.sF(function getN2(results) {
					var b;
					for (i = 0; i < results.length; i += 1) {
						b = results[i].basic;
						if (b) {
							if (b.lastname) {
								lastname = b.lastname;
							}

							if (b.firstname) {
								firstname = b.firstname;
							}
						}
					}

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

			if (mail) {
				users[mail] = theUser;
			}

			if (nickname) {
				users[nickname] = theUser;
			}

			return theUser;
		}

		var api = {
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