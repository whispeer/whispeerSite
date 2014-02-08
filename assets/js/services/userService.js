define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var advancedBranches = ["location", "birthday", "relationship", "education", "work", "gender", "languages"];
	var advancedDefaults = [{}, {}, {}, [], {}, "", []];

	var service = function ($rootScope, $location, socketService, sessionService, keyStoreService, ProfileService, initService, settingsService) {

		var NotExistingUser = {
			getName: function (cb) {
				cb("Not Existing User");
			}
		};

		var knownIDs = [];

		var users = {};
		var loading = {};

		var User = function (providedData) {
			var theUser = this, mainKey, signKey, cryptKey, friendShipKey, friendsKey, friendsLevel2Key;
			var id, mail, nickname, publicProfile, privateProfiles = [], mutualFriends, publicProfileChanged = false, publicProfileSignature;

			this.data = {};

			function updateUser(userData) {
				if (id && parseInt(userData.id, 10) !== parseInt(id, 10)) {
					throw "user update invalid";
				}

				mutualFriends = userData.mutualFriends;

				id = parseInt(userData.id, 10);
				mail = userData.mail;
				nickname = userData.nickname;

				//do not overwrite keys.
				if (!mainKey && userData.keys.main) {
					mainKey = keyStoreService.upload.addKey(userData.keys.main);
				}

				if (!signKey && userData.keys.sign) {
					signKey = keyStoreService.upload.addKey(userData.keys.sign);
				}

				if (!cryptKey && userData.keys.crypt) {
					cryptKey = keyStoreService.upload.addKey(userData.keys.crypt);
				}

				if (!friendShipKey && userData.keys.friendShip) {
					friendShipKey = keyStoreService.upload.addKey(userData.keys.friendShip);
				}

				if (!friendsKey && userData.keys.friends) {
					friendsKey = keyStoreService.upload.addKey(userData.keys.friends);
				}

				if (!friendsLevel2Key && userData.keys.friendsLevel2) {
					friendsLevel2Key = keyStoreService.upload.addKey(userData.keys.friendsLevel2);
				}

				publicProfileSignature = userData.profile.pub.signature;
				delete userData.profile.pub.signature;

				publicProfile = userData.profile.pub;

				privateProfiles = [];

				//todo: update profiles. for now: overwrite
				if (userData.profile && userData.profile.priv && userData.profile.priv instanceof Array) {
					var priv = userData.profile.priv, i;
					for (i = 0; i < priv.length; i += 1) {
						privateProfiles.push(new ProfileService(priv[i]));
					}
				}

				theUser.data = {
					user: theUser,
					id: id,
					basic: {
						age: "?",
						location: "?",
						mutualFriends: mutualFriends,
						url: "/user/" + nickname
					},
					advanced: {
						birthday:	{
							day:	"",
							month: "",
							year:	""
						},
						location: {
							town:	"",
							state: "",
							country: ""
						},
						partner:	{
							type:	"",
							name: ""
						},
						education: [],
						job: {
							what: "",
							where: ""
						},
						gender: "",
						languages: []
					}
				};
			}

			updateUser(providedData);

			this.setFriendShipKey = function (key) {
				if (!friendShipKey) {
					friendShipKey = key;
				}
			};

			function setPrivateProfile(attrs, val, visible, cb) {
				var priv = theUser.getPrivateProfiles();
				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						priv[i].getScope(this.parallel());
					}
				}, h.sF(function (scopes) {
					if (scopes.length !== priv.length) {
						throw "bug";
					}

					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (visible.indexOf(scopes[i]) > -1) {
							priv[i].setAttribute(attrs, val, this.parallel());
						}
					}
				}), cb);
			}

			function setPublicProfile(attrs, val, cb) {
				var pub = theUser.getProfile();
				publicProfileChanged = h.deepSetCreate(pub, attrs, val) || publicProfileChanged;
				cb();
			}

			function uploadChangedProfile(cb) {
				var data = {};
				var priv = theUser.getPrivateProfiles();

				step(function () {
					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (priv[i].changed()) {
							priv[i].getUpdatedData(theUser.getSignKey(), this.parallel());
						}
					}
					//TODO sign public profile!
					this.parallel()();
				}, h.sF(function (profiles) {
					if (profiles && profiles.length > 0) {
						data.priv = profiles;
					}

					if (publicProfileChanged) {
						data.pub = theUser.getProfile();
						keyStoreService.sign.signObject(data.pub, signKey, this);
					} else {
						this.ne();
					}
				}), h.sF(function (signature) {
					if (publicProfileChanged) {
						data.pub.signature = signature;
					}

					if (data.priv || data.pub) {
						socketService.emit("user.profileChange", data, this);
					} else {
						this.last.ne(true);
					}
				}), h.sF(function (result) {
					if (!result.errors.pub) {
						publicProfileChanged = false;
					}

					var i;
					for (i = 0; i < priv.length; i += 1) {
						if (result.allok || result.errors.priv.indexOf(priv[i].getID()) === -1) {
							priv[i].updated();
							this.ne(true);
						} else {
							this.ne(false);
							//TODO
						}
					}
					//TODO

				}), cb);
			}

			function setProfileAttribute(attrs, val, cb) {
				step(function () {
					settingsService.getPrivacyVisibility(attrs, this);
				}, h.sF(function (visible) {
					if (visible === false) {
						setPublicProfile(attrs.split("."), val, this);
					} else if (visible) {
						setPrivateProfile(attrs.split("."), val, visible, this);
					}
				}), cb);
			}

			this.uploadChangedProfile = uploadChangedProfile;
			this.setProfileAttribute = setProfileAttribute;

			function getProfileAttribute(attrs, cb) {
				step(function () {
					var priv = theUser.getPrivateProfiles(), i;

					for (i = 0; i < priv.length; i += 1) {
						priv[i].getAttribute(attrs, this.parallel());
					}

					this.parallel()();
				}, h.sF(function (results) {
					var i;
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

			var basicDataLoaded = false;

			this.update = updateUser;

			this.loadFullData = function (cb) {
				step(function () {
					var i;
					for (i = 0; i < advancedBranches.length; i += 1) {
						getProfileAttribute([advancedBranches[i]], this.parallel());
					}
					theUser.loadBasicData(this.parallel());
				}, h.sF(function (result) {
					var i, a = theUser.data.advanced;
					for (i = 0; i < advancedBranches.length; i += 1) {
						a[advancedBranches[i]] = result[i] || advancedDefaults[i];
					}

					this.ne();
				}), cb);
			};

			this.loadBasicData = function (cb) {
				step(function () {
					if (!basicDataLoaded) {
						this.parallel.unflatten();

						theUser.getShortName(this.parallel());
						theUser.getName(this.parallel());
						theUser.getImage(this.parallel());
					}
				}, h.sF(function (shortname, name, image) {
					theUser.data.me = theUser.isOwn();
					theUser.data.other = !theUser.isOwn();

					theUser.data.name = name;
					theUser.data.basic.shortname = shortname;
					theUser.data.basic.image = image;

					this.ne();
				}), cb);
			};

			this.isOwn = function () {
				return theUser.getID() === sessionService.getUserID();
			};

			this.getNickOrMail = function () {
				return nickname || mail;
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

			this.getFriendShipKey = function () {
				return friendShipKey;
			};

			this.getContactKey = function () {
				return friendsKey || cryptKey;
			};

			this.getFriendsKey = function () {
				return friendsKey;
			};

			this.getFriendsLevel2Key = function () {
				return friendsLevel2Key;
			};

			this.getID = function () {
				return parseInt(id, 10);
			};

			this.visitProfile = function () {
				var url = theUser.getUrl();
				$location.path(url);
			};

			this.getUrl = function () {
				return "/user/" + this.getNickname();
			};

			this.getNickname = function () {
				return nickname;
			};

			this.getMail = function () {
				return mail;
			};

			this.getProfile = function () {
				return publicProfile;
			};

			this.getPrivateProfiles = function () {
				return privateProfiles;
			};

			this.getImage = function (cb) {
				step(function () {
					getProfileAttribute("image", this);
				}, h.sF(function (image) {
					if (image) {
						this.ne(image);
					} else {
						this.ne("/assets/img/user.png");
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

			function updateProperty(partial, str, cb) {
				if (!partial) {
					cb();
				} else if (typeof partial === "object" && !partial instanceof Array) {
					updatePartial(partial, str, cb);
				} else {
					theUser.setProfileAttribute(str, partial, cb);
				}
			}

			function updatePartial(partial, str, cb) {
				step(function () {
					var attr;

					for (attr in partial) {
						if (partial.hasOwnProperty(attr)) {
							updateProperty(partial[attr], str + "." + attr, this.parallel());
						}
					}
				}, cb);
			}

			this.setAdvancedProfile = function (adv, cb) {
				step(function () {
					var i;
					for (i = 0; i < advancedBranches.length; i += 1) {
						updateProperty(adv[advancedBranches[i]], advancedBranches[i], this.parallel());
					}
				}, cb);
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

		$rootScope.$on("ssn.login", function () {
			initService.register("user.get", {identifier: sessionService.getUserID()}, function (data) {
				var user = api.addFromData(data);

				var identifier = user.getNickOrMail();

				window.own = user;

				keyStoreService.setKeyGenIdentifier(identifier);
				improvementListener(identifier);
			});
		});

		$rootScope.$on("ssn.reset", function () {
			api.reset();
		});

		return api;
	};

	service.$inject = ["$rootScope", "$location", "ssn.socketService", "ssn.sessionService", "ssn.keyStoreService", "ssn.profileService", "ssn.initService", "ssn.settingsService"];

	return service;
});