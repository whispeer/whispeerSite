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
			var theUser = this, mainKey, signKey, cryptKey, friendKey, friendsLevel2Key;

			if (data.keys.main) {
				mainKey = keyStoreService.upload.addKey(data.keys.main);
			}

			if (data.keys.sign) {
				signKey = keyStoreService.upload.addKey(data.keys.sign);
			}

			if (data.keys.crypt) {
				cryptKey = keyStoreService.upload.addKey(data.keys.crypt);
			}

			if (data.keys.friends) {
				friendKey = keyStoreService.upload.addKey(data.keys.friends);
			}

			if (data.keys.friendsLevel2Key) {
				friendsLevel2Key = keyStoreService.upload.addKey(data.keys.friendsLevel2Key);
			}

			if (data.profile && data.profile.priv && data.profile.priv instanceof Array) {
				var priv = data.profile.priv, i;
				for (i = 0; i < priv.length; i += 1) {
					priv[i] = new ProfileService(priv[i]);
				}
			}

			function getProfileAttribute(attrs, cb) {
				step(function () {
					var priv = theUser.getPrivateProfiles(), i;

					if (priv) {
						for (i = 0; i < priv.length; i += 1) {
							priv[i].getAttribute(attrs, this.parallel());
						}
					} else {
						this.ne([]);
					}
				}, h.sF(function (results) {
					if (results) {
						for (i = 0; i < results.length; i += 1) {
							if (results[i]) {
								this.last.ne(results[i]);
								return;
							}
						}
					}

					var pub = theUser.getProfile();

					this.last.ne(h.deepGet(pub, attrs));
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
				return "/user/" + this.getNickname();
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
					getProfileAttribute("image", this);
				}, h.sF(function (image) {
					if (image) {
						this.ne(image);
					} else {
						this.ne("/img/profil.jpg");
					}
				}), cb);
			};

			this.getShortName = function (cb) {
				step(function getSN1() {
					this.parallel.unflatten();

					getProfileAttribute(["basic", "firstname"], this.parallel());
					getProfileAttribute(["basic", "lastname"], this.parallel());
				}, h.sF(function (firstname, lastname) {
					var nickname = theUser.getNickname();

					this.ne(firstname || lastname || nickname || "");
				}), cb);
			};

			this.getName = function (cb) {
				step(function getN1() {
					this.parallel.unflatten();

					getProfileAttribute(["basic", "firstname"], this.parallel());
					getProfileAttribute(["basic", "lastname"], this.parallel());
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

		var loadListeners = {};

		var toLoad = [];
		var timer_started = false;
		var THROTTLE = 20;

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
				knownIDs = [];
				loading = {};
			},

			get: function getF(identifier, cb) {
				step(function () {
					loadUser(identifier, this);
				}, cb);
			},

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

			addFromData: function addFromData(data) {
				return makeUser(data);
			},

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
							var toUpload = keyStoreService.upload.getDecryptors();
							console.log(toUpload);
							socketService.emit("key.addFasterDecryptors", {
								keys: toUpload
							}, this);
						}), h.sF(function (result) {
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

		function loadOwnData() {
			step(function () {
				socketService.emit("data", {
					"user": {
						"get": {
							identifier: sessionService.getUserID()
						}
					},
					"friends": {
						"getAll": {}
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
					improvementListener(identifier);

					$rootScope.$broadcast("ssn.ownLoaded", data);
				} else {
					console.error(e);
				}
			});
		}

		$rootScope.$on("ssn.login", function () {
			if (sessionService.isLoggedin()) {
				loadOwnData();
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