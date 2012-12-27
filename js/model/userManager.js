define(['jquery', 'asset/logger', 'asset/helper', 'asset/exceptions', 'config', 'crypto/sessionKey', 'model/session', 'libs/step', 'libs/jquery.json.min'], function ($, logger, h, exceptions, config, SessionKey, session, step) {
	"use strict";

	//TODO
	//var SessionKey, session, i18n, crypto;

	/** valid profile attributes not needed yet*/
	//var validAttributes = {"firstname": true, "lastname": true};
	/** users by id */
	var usersID = {};
	/** users by nickname */
	var usersNickname = {};
	/** user loaded time */
	var loadedTime = {};

	/** own friends */
	var friends;
	/** own friendShipRequests */
	var friendShipRequests;
	/** own friend ship requested from other persons */
	var friendShipRequested;
	/** when were friends loaded? */
	var friendsLoaded = 0;
	/** what kind of keys do user have? */
	var userKeys = ["wall", "profile", "share"];

	var userManager;

	var User = function (data) {
		/** users friends list */
		var friendsList;

		/** userid */
		var userid = 0;

		/** users nickname */
		var nickname;

		/** users public profile */
		var publicProfile;
		/** users private profiles */
		var profiles;

		/** scheme for user profiles. defines how much of user profiles was already loaded */
		var scheme = 0;

		/** users public key */
		var publicKey;

		/** users session keys */
		var sessionKeys = {};

		/** to have this in other contextes. */
		var that = this;
		var theUser = this;

		/** transform a keys json object to a keys object
		* @param k keys json representation
		* @author Nilos
		*/
		var keysToObjects = function (k) {
			logger.log("keysToObject");

			var i = 0, currentKey = null;
			for (i = 0; i < userKeys.length; i += 1) {
				var uK = userKeys[i];
				if (h.arraySet(k, uK)) {
					if (uK === "profile" && that.ownUser()) {
						var groupid;
						for (groupid in k[uK]) {
							if (k[uK].hasOwnProperty(groupid)) {
								currentKey = k[uK][groupid];
								if (!(currentKey instanceof SessionKey)) {
									currentKey = new SessionKey(currentKey);

									k[uK][groupid] = currentKey;
								}
							}
						}
					} else {
						if (k[uK] === false) {
							delete k[uK];
						} else {
							currentKey = k[uK];
							if (!(currentKey instanceof SessionKey)) {
								currentKey = new SessionKey(currentKey);

								k[uK] = currentKey;
							}
						}
					}
				} else {
					logger.log("Session Key problem. Sessionkey for '" + uK + "' not found");
					logger.log(k);
				}
			}

			return k;
		};

		/** get the link for the user */
		this.getLink = function () {
			return "#view=profile&userid=" + this.getUserID();
		};

		/** get the scheme */
		this.getScheme = function () {
			return scheme;
		};

		var uLoadProfile = function (profileData) {
			//this needs some improvements, to not re-decrypt data.
			profiles = profileData;

			var value;
			if (that.ownUser()) {
				var groupid;
				for (groupid in profiles) {
					if (profiles.hasOwnProperty(groupid)) {
						for (value in profiles[groupid]) {
							if (profiles[groupid].hasOwnProperty(value) && value !== "iv") {
								profiles[groupid][value] = {d: false, v: profiles[groupid][value]};
							}
						}
					}
				}
			} else {
				for (value in profiles) {
					if (profiles.hasOwnProperty(value) && value !== "iv") {
						profiles[value] = {d: false, v: profiles[value]};
					}
				}
			}
		};

		/** load profile from json
		* @param profile json representation of profile
		* @author Nilos
		*/
		this.loadFromJSON = function (profile) {
			var jsonData;
			if (typeof profile === "string") {
				jsonData = $.parseJSON(profile);
			} else {
				jsonData = profile;
			}

			if (jsonData === null) {
				return false;
			}

			if (typeof jsonData.id !== "undefined") {
				if (userid === jsonData.id || userid === 0) {
					userid = jsonData.id;
					nickname = jsonData.nickname;

					scheme = jsonData.scheme;

					if (h.isset(jsonData.sessionKey)) {
						sessionKeys = jsonData.sessionKey;
						sessionKeys = keysToObjects(sessionKeys);
					}

					publicProfile = jsonData["public"];
					uLoadProfile(jsonData["private"]);

					return true;
				}
			}

			return false;
		};

		/** is this the own user? */
		this.ownUser = function () {
			return (parseInt(session.userid, 10) === parseInt(userid, 10));
		};

		/** get this users name
		* returns: firstname lastname or nickname if no firstname and lastname set.
		*/
		this.getName = function (callback) {
			step(function loadData() {
				theUser.getValue("firstName", this.parallel());
				theUser.getValue("lastName", this.parallel());
			}, h.sF(function theData(data) {
				var firstName = data[0];
				var lastName = data[1];
				if (firstName !== "" || lastName !== "") {
					this.last.ne(firstName + " " + lastName);
					return;
				}

				if (typeof nickname !== "undefined" && nickname !== "") {
					this.last.ne(nickname);
					return;
				}

				require.wrap("asset/i18n!user", this);
			}), h.sF(function thei18n(i18n) {
				this.ne(i18n.getValue("user.unknownName"));
			}), callback);
		};

		this.getValue = function (name, group, callback) {
			if (typeof group === "function") {
				callback = group;
				group = undefined;
			}
		
			var activeProfile;
			name = name.toLowerCase();

			step(function loadDeps() {
				require.wrap("crypto/crypto", this);
			}, h.sF(function c(crypto) {
				//get the profile we are looking at. 
				if (theUser.ownUser()) {
					//ownUser: get the group which has a attribute of this name.
					if (typeof group !== "number") {
						var groupid;
						for (groupid in profiles) {
							if (profiles.hasOwnProperty(groupid)) {
								if (h.arraySet(profiles, groupid,  name)) {
									activeProfile = profiles[group];
								}
							}
						}
					}
				} else {
					activeProfile = profiles;
				}

				//decrypt or just return if already decrypted.
				if (h.arraySet(activeProfile, name)) {
					if (activeProfile[name].d === false) {
						if (sessionKeys.profile.isSymKey()) {
							crypto.decryptText(session.getKey(),
								'{"ct": "' + activeProfile[name].v + '", "iv": "' + activeProfile.iv + '"}', sessionKeys.profile, this);
						} else {
							crypto.decryptText(session.getMainKey(),
								'{"ct": "' + activeProfile[name].v + '", "iv": "' + activeProfile.iv + '"}', sessionKeys.profile, this);
						}
					} else {
						this.last(null, activeProfile[name].v);
					}
				} else {
					//don't have a value ... 
					this(null, false);
				}
			}), h.sF(function userValDecrypted(decrypted) {
				//decrypted value ready. return if given (not false)
				if (decrypted !== false) {
					activeProfile[name].d = true;
					activeProfile[name].v = decrypted;

					this.last(null, activeProfile[name].v);
				} else {
					this();
				}
			}), h.sF(function userValGetPublic() {
				//last possibility: get publicProfile value
				if (h.arraySet(publicProfile, name)) {
					this(null, publicProfile[name]);
				} else {
					this(null, "");
				}
			}), callback);
		};

		/** get this users id */
		this.getUserID = function () {
			return userid;
		};

		/** get this users nickname */
		this.getNickname = function () {
			return nickname;
		};

		/** get this users public key
		* @param callback called with the public key
		* @param overwrite load key from server if true
		* @author Nilos
		* This needs a callback because the key is not automatically send with the profile.
		*/
		this.getPublicKey = function (callback, overwrite) {
			var PublicKey;
			step(function loadDeps() {
				require.wrap("crypto/publicKey", this);
			}, h.sF(function (p) {
				PublicKey = p;
				if (!h.isset(publicKey) || !(publicKey instanceof PublicKey) || overwrite === true) {
					h.getData({"publicKey": [userid]}, this);
				} else {
					this.last(null, publicKey);
				}
			}), h.sF(function getPubKey(data) {
				publicKey = new PublicKey(data.publicKey[userid]);
				this(null, publicKey);
			}), callback);
		};

		/** check a signature for this user.
		* @param signature the signature
		* @param message original message
		* @param callback called when result is ready
		* @author Nilos
		* gets public key and checks signature.
		*/
		this.checkSignature = function (signature, message, callback) {
			var publicKey;
			step(function () {
				theUser.getPublicKey(this);
			}, h.sF(function (p) {
				publicKey = p;
				require.wrap("crypto/crypto", this);
			}), h.sF(function (crypto) {
				crypto.verifyText(publicKey, message, signature, this);
			}), callback);
		};

		/** get this users session keys
		* @param callback called with the session keys
		* @param overwrite load keys from server if true
		* @author Nilos
		*/
		this.getSessionKeys = function (callback, overwrite) {
			step(function loadDeps() {
				require.wrap("crypto/sessionKey", this);
			}, h.sF(function (s) {
				SessionKey = s;
				if (typeof sessionKeys === "undefined" || overwrite === true) {
					this.ne();
				} else {
					this.last.ne(sessionKeys);
				}
			}), h.sF(function () {
				var getData = {"sessionKey": {}};
				var i = 0;
				for (i = 0; i < userKeys.length; i += 1) {
					getData.sessionKey[userKeys[i]] = [userid];
				}

				h.getData(getData, this);
			}), h.sF(function () {
				sessionKeys = keysToObjects(data.sessionKey);
				this.ne(sessionKeys);
			}), callback);
		};

		/** decrypt a key.
		* @param key key to decrypt
		* @param callback callback
		*/
		var decrypt = function (key, callback) {
			step(function decryptKey() {
				console.log(key);
				console.log(session.getMainKey());
				console.log(session.getKey());
				if (key.isSymKey()) {
					key.decryptKey(session.getMainKey(), this.last);
				} else {
					key.decryptKey(session.getKey(), this);
				}
			}, h.sF(function keyDecrypted(d) {
				if (d) {
					h.setSymAsymKey(key);
				}

				this();
			}), callback);
		};

		/** decrypt this users key
		* @param callback called when keys are decrypted
		* @author Nilos
		*/
		this.decryptKeys = function (callback) {
			var k = sessionKeys;
			step(function () {
				var i = 0;
				for (i = 0; i < userKeys.length; i += 1) {
					var uK = userKeys[i];
					if (h.arraySet(k, uK)) {
						if (uK === "profile" && theUser.ownUser()) {
							var groupid;
							for (groupid in k[uK]) {
								if (k[uK].hasOwnProperty(groupid)) {
									decrypt(k[uK], this.parallel());
								}
							}
						} else {
							decrypt(k[uK], this.parallel());
						}
					} else {
						logger.log("Session Key problem. Sessionkey for '" + uK + "' not found");
						logger.log(k);
					}
				}
			}, h.sF(function (d) {
				var i;
				for (i = 0; i < d.length; i += 1) {
					if (!d[i]) {
						this(null, false);
						return;
					}
				}
			}), callback);
		};

		/** get this users friends as object
		* @param callback called with user list
		* @author Nilos
		*/
		this.friends = function (callback) {
			step(function loadFriendData() {
				h.getData({"friends": userid}, this);
			}, h.sF(function (f) {
				userManager.loadUsers(f.friends, userManager.BASIC, this);
			}), h.sF(function (u) {
				friendsList = u;
				this.ne(u);
			}), callback);
		};

		/** check if this user has a certain friend
		* @param userid userid of friend to check for
		* @param callback called with result
		* @author Nilos
		*/
		this.hasFriend = function (userid, callback) {
			step(function loadFriends() {
				h.getData({"friends": userid}, this);
			}, h.sF(function (f) {
				var friends = f.friends;
				var i;
				for (i = 0; i < friends.length; i += 1) {
					if (friends[i] === userid) {
						this.ne(true);
						return;
					}
				}

				this.ne(false);
			}), callback);
		};

		/** checks if this user is a friend */
		this.isFriend = function () {
			var friends = userManager.friends();
			var i;
			for (i = 0; i < friends.length; i += 1) {
				if (friends[i] === theUser.getUserID()) {
					return true;
				}
			}

			return false;
		};

		/** checks if this user has requested a friendship */
		this.hasFriendShipRequested = function () {
			var friendShipRequests = userManager.friendShipRequests();
			var i;
			for (i = 0; i < friendShipRequests.length; i += 1) {
				if (friendShipRequests[i] === theUser.getUserID()) {
					return true;
				}
			}

			return false;
		};

		/** checks if own user has requested friendship */
		this.didIRequestFriendShip = function () {
			var friendShipRequested = userManager.friendShipRequested();
			var i;
			for (i = 0; i < friendShipRequested.length; i += 1) {
				if (friendShipRequested[i] === theUser.getUserID()) {
					return true;
				}
			}

			return false;
		};

		/** friendship this user
		* @param callback called with true if success
		* @group group to put this user into
		*/
		this.friendShip = function (callback, group) {
			if (typeof group === "undefined") {
				group = 1;
			}

			var crypto;
			var publicKey, keys;
			step.startTiming();

			var time = new Date().getTime();
			step(function doRequire() {
				require.wrap(["crypto/waitForReady", "crypto/crypto"], this);
			}, h.sF(function wait(waitForReady, c) {
				crypto = c;
				logger.log("deps:" + ((new Date().getTime()) - time));
				waitForReady(this);

			}), h.sF(function getPublicKey() {
				that.getPublicKey(this);

			}), h.sF(function thePublicKey(pk) {
				logger.log("pubKey:" + ((new Date().getTime()) - time));
				publicKey = pk;
				session.getOwnUser(this);

			}), h.sF(function theOwnUser(u) {
				logger.log("ownUser:" + ((new Date().getTime()) - time));
				u.getSessionKeys(this);

			}), h.sF(function theSessionKeys(k) {
				keys = k;
				logger.log("skeys:" + ((new Date().getTime()) - time));
				crypto.signText(session.getKey(), "friendShip" + userid, this);

			}), h.sF(function theSignature(signature) {
				logger.log("sign:" + ((new Date().getTime()) - time));

				var resultKeys = {};

				var i = 0;
				for (i = 0; i < userKeys.length; i += 1) {
					if (userKeys[i] === "profile") {
						resultKeys[userKeys[i]] = crypto.encryptSessionKey(publicKey, keys[userKeys[i]][group], session.getKey());
					} else {
						resultKeys[userKeys[i]] = crypto.encryptSessionKey(publicKey, keys[userKeys[i]], session.getKey());
					}
				}

				logger.log("keys encrypted:" + ((new Date().getTime()) - time));

				var friendShip = [];
				var friendShipR = {
					"id": userid,
					"sig": signature,
					"keys": resultKeys
				};

				friendShip.push(friendShipR);
				var getData = {
					"friendShip": friendShip
				};

				logger.log("sending:" + ((new Date().getTime()) - time));

				h.getData(getData, this);
			}), h.sF(function () {
				userManager.loadFriends(true, this);
			}), h.sF(function (data) {
				if (data.friendShip[userid] === "true" || data.friendShip[userid]) {
					logger.log("done:" + ((new Date().getTime()) - time));
					callback(true);
				} else {
					callback(false);
				}
			}), callback);

			step.stopTiming();
		};

		//load data from json
		if (!this.loadFromJSON(data)) {
			logger.log("User loading failed!");
			logger.log(data);

			throw new exceptions.userNotExisting();
		}
	};

	/** Get an already loaded user from arrays
	* @param identifier identifier of the user.
	* @author Nilos
	*/
	var pUmGetLoadedUser = function (identifier) {
		if (h.isID(identifier)) {
			return usersID[identifier];
		}

		if (h.isNickname(identifier)) {
			return usersNickname[identifier];
		}

		return false;
	};

	/** Add a user to the loaded lists. Update timestamp.
	* @param user user object to add to cache objects.
	*/
	var pUmAddLists = function (user) {
		var id = user.getUserID();
		var nickname = user.getNickname();

		usersID[id] = user;
		loadedTime[id] = new Date().getTime();

		if (typeof nickname !== "undefined") {
			usersNickname[nickname] = user;
		}
	};

	/** make raw userdata to users */
	var pUmMakeUsers = function (profiles) {
		var id;
		var users = [];
		for (id in profiles) {
			if (profiles.hasOwnProperty(id)) {
				if (profiles[id] !== "false") {
					var theUser;

					if (userManager.userLoaded(id)) {
						theUser = usersID[id];
						theUser.loadFromJSON(profiles[id]);
					} else {
						theUser = new User(profiles[id]);
					}

					pUmAddLists(theUser);
					users.push(theUser);
				}
			}
		}

		return users;
	};

	/** manages user. */
	userManager = {
		reset: function () {
			usersID = {};
			usersNickname = {};
			loadedTime = {};

			friendsLoaded = 0;
		},

		/** Load users.
		* identifiers: array of identifiers to load users for.
		* scheme: how many data to load. "scheme"
		* callback: function to call onload. called with array of users.
		* done
		*/
		loadUsers: function (identifiers, scheme, callback) {
			var i = 0;
			var userRequest = {};
			var usersLoaded = [];

			var request = false;

			step(function startup() {
				if (identifiers.length === 0) {
					this.last(null, []);
				} else {
					this();
				}
			}, h.sF(function findUsersToLoad() {
				for (i = 0; i < identifiers.length; i += 1) {
					var theUser = pUmGetLoadedUser(identifiers[i]);
					if (userManager.userLoaded(identifiers[i]) && theUser.getScheme() >= scheme) {
						usersLoaded.push(theUser);
					} else {
						userRequest[identifiers[i]] = scheme;
						request = true;
					}
				}

				this.ne();
			}), h.sF(function isRequest() {
				if (request) {
					this();
				} else {
					this.last(null, usersLoaded);
				}
			}), h.sF(function loadUserData() {
				var getData = {"userProfile": userRequest};

				h.getData(getData, this);
			}), h.sF(function (data) {
				if (typeof data.userProfile === "object") {
					var users = pUmMakeUsers(data.userProfile);
					this(null, users.concat(usersLoaded));
				}
			}), callback);
		},

		/** Load one user.
		* identifier: identifier of user.
		* scheme: "scheme"
		* callback: function to call when user is loaded
		* done
		**/
		getUser: function (identifier, scheme, callback) {
			step(function loadUsers() {
				userManager.loadUsers([identifier], scheme, this);
			}, h.sF(function (users) {
				this(null, users[0]);
			}), callback);
		},

		userLoaded: function (identifier) {
			if (h.isID(identifier)) {
				return typeof usersID[identifier] === "object" && usersID[identifier] instanceof User;
			}

			if (h.isNickname(identifier)) {
				return typeof usersNickname[identifier] === "object" && usersNickname[identifier] instanceof User;
			}

			console.trace();
			//not a valid user identifier
			throw new exceptions.invalidUserIdentifier(identifier);
		},

		search: function (search, callback) {
			step(function loadResults() {
				h.getData({"search": search}, this);
			}, h.sF(function (data) {
				var results = [];

				var theUser;
				var user;
				for (user in data.search) {
					if (data.search.hasOwnProperty(user)) {
						if (userManager.userLoaded(user)) {
							theUser = pUmGetLoadedUser(user);
						} else {
							theUser = new User(data.search[user]);
						}

						results.push(theUser);
					}
				}

				this(null, results);
			}), callback);
		},

		getPublicKeys: function (userids, callback) {
			var PublicKey;
			step(function loadDeps() {
				require.wrap("crypto/publicKey", this);
			}, h.sF(function (p) {
				PublicKey = p;
				h.getData({"publicKey": userids}, this);
			}), h.sF(function (data) {
				var key;
				var keys = [];

				for (key in data.publicKey) {
					if (data.publicKey.hasOwnProperty(key)) {
						keys.push(new PublicKey(data.publicKey[key]));
					}
				}

				this(null, keys);
			}), callback);
		},

		loadFriends: function (callback, loadAnyHow) {
			step(function shouldLoad() {
				if (loadAnyHow === true || config.reloadAfter < new Date().getTime() - friendsLoaded) {
					h.getData({
						"friendShipRequests": "true",
						"friendShipRequested": "true",
						"friends": "true"
					}, this);
				} else {
					this.last();
				}
			}, h.sF(function (data) {
				friends = data.friends;
				friendShipRequests = data.friendShipRequests;
				friendShipRequested = data.friendShipRequested;

				friendsLoaded = new Date().getTime();

				this();
			}), callback);
		},

		friendShipFunction: function (user) {
			if (userManager.userObject(user)) {
				return function () {
					user.friendShip(function (ok) {
						if (ok) {
							$("[name='friendShipDelete" + user.getUserID() + "']").hide();
							//$("name=firendShipText" + user.getUserID()).hide();
						}
					}, 1);
				};
			}
		},

		userObject: function (obj) {
			return obj instanceof User;
		},

		friends: function () {
			return friends;
		},

		friendsUser: function (callback) {
			step(function loadFriends() {
				this.loadUsers(friends, userManager.BASIC, this);
			}, callback);
		},

		friendShipRequestsUser: function (callback) {
			step(function loadFRequestsUser() {
				this.loadUsers(friendShipRequests, userManager.BASIC, this);
			}, callback);
		},

		friendShipRequests: function () {
			return friendShipRequests;
		},

		friendShipRequested: function () {
			return friendShipRequested;
		}
	};

	userManager.BASIC = 1;
	userManager.FULL = 10;

	return userManager;
});