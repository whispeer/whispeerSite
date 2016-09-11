/**
* friendsService
**/
define(["step", "whispeerHelper", "asset/observer", "asset/securedDataWithMetaData", "services/serviceModule", "bluebird"], function (step, h, Observer, SecuredData, serviceModule, Bluebird) {
	"use strict";

	/*
		friendship:

		SecuredData(undefined, {
			friend: uid
		})
	*/

	//we need locking here!

	var service = function ($rootScope, $injector, socket, sessionService, keyStore, initService) {
		var friends = [], requests = [], requested = [], ignored = [], removed = [], deleted = [], signedList, onlineFriends = {}, friendsService;
		var friendsData = {
			requestsCount: 0,
			friendsCount: 0,
			requestedCount: 0
		};

		function updateCounters() {
			friendsData.friendsCount = friends.length;
			friendsData.requestsCount = requests.length;
			friendsData.requestedCount = requested.length;
		}

		function userOnline(uid, status) {
			onlineFriends[uid] = status;
			friendsService.notify(status, "online:" + uid);
		}

		function createBasicData(ownUser, otherUser, cb) {
			var friendShipKey;
			step(function () {
				//encr intermediate key w/ users cryptKey
				keyStore.sym.asymEncryptKey(ownUser.getFriendsKey(), otherUser.getCryptKey(), this);
			}, h.sF(function (_friendShipKey) {
				friendShipKey = _friendShipKey;
				var mainKey = ownUser.getMainKey();

				this.parallel.unflatten();
				SecuredData.load(undefined, {
					user: otherUser.getID()
				}, { type: "friendShip" }).sign(ownUser.getSignKey(), this.parallel());

				var listData = {};
				listData[otherUser.getID()] = friendShipKey;
				signedList.metaSetAttr(otherUser.getID(), friendShipKey);
				signedList.sign(ownUser.getSignKey(), this.parallel());

				keyStore.sym.symEncryptKey(friendShipKey, mainKey, this.parallel());
			}), h.sF(function (securedData, signedList) {
				var data = {
					signedList: signedList,
					meta: securedData,
					key: keyStore.upload.getKey(friendShipKey)
				};

				this.ne(data, friendShipKey);
			}), cb);
		}

		function generateRemovalData(ownUser, otherUser, cb) {
			var signedRemoval, updatedSignedList;
			step(function () {
				this.parallel.unflatten();
				SecuredData.load(undefined, {
					initial: removed.indexOf(ownUser.getID()) === -1,
					user: otherUser.getID()
				}, { type: "removeFriend" }).sign(ownUser.getSignKey(), this.parallel());

				signedList.metaRemoveAttr(otherUser.getID());
				signedList.sign(ownUser.getSignKey(), this.parallel());
			}, h.sF(function (_signedRemoval, _signedList) {
				signedRemoval = _signedRemoval;
				updatedSignedList = _signedList;

				ownUser.generateNewFriendsKey(this);
			}), h.sF(function (signedKeys, newFriendsKey) {
				this.ne(signedRemoval, updatedSignedList, signedKeys, newFriendsKey);
			}), cb);
		}

		function addAsFriend(uid, cb) {
			var otherUser, friendShipKey, userService = $injector.get("ssn.userService");
			step(function () {
				friendsService.awaitLoading(this);
			}, h.sF(function () {
				userService.get(uid, this);
			}), h.sF(function (u) {
				otherUser = u;
				createBasicData(userService.getown(), otherUser, this);
			}), h.sF(function (data, _friendShipKey) {
				friendShipKey = _friendShipKey;

				var friendsKey = userService.getown().getFriendsKey();
				data.decryptors = keyStore.upload.getDecryptors([friendsKey], [friendShipKey]);

				socket.emit("friends.add", data, this);
			}), h.sF(function (result) {
				if (result.success) {
					otherUser.setFriendShipKey(friendShipKey);

					if (result.friends) {
						friends.push(uid);
						h.removeArray(requests, uid);
						friendsService.notify(uid, "new");
					} else {
						requested.push(uid);
						friendsService.notify(uid, "newRequested");
					}

					updateCounters();

					this.ne();
				}
			}), cb);
		}

		socket.channel("friendRequest", function (e, requestData) {
			var uid = h.parseDecimal(requestData.uid);
			if (!h.containsOr(uid, requests, friends, requested))  {
				requests.push(uid);
				updateCounters();

				friendsService.notify(uid, "newRequest");
			}
		});

		socket.channel("friendAccept", function (e, requestData) {
			var uid = h.parseDecimal(requestData.uid);
			if (!h.containsOr(uid, requests, friends))  {
				friends.push(uid);
				h.removeArray(requested, uid);

				updateCounters();

				friendsService.notify(uid, "new");

				userOnline(uid, 2);
			}
		});

		socket.channel("friendOnlineChange", function (e, requestData) {
			userOnline(requestData.uid, requestData.status);
		});

		function checkAndRemove(uid, cb) {
			var userService = $injector.get("ssn.userService");
			step(function () {
				this.parallel.unflatten();

				userService.get(uid, this.parallel());
				socket.emit("friends.getSignedData", {
					uid: uid
				}, this.parallel());
			}, h.sF(function (user, data) {
				var signedData = data.signedData;
				if (h.parseDecimal(signedData.user) !== userService.getown().getID() || signedData.initial === "false") {
					throw new Error("invalid signed removal");
				}

				SecuredData.load(undefined, signedData, { type: "removeFriend" }).verify(user.getSignKey(), this);
			}), h.sF(function () {
				friendsService.removeFriend(uid, this);
			}), cb);
		}

		function removeUnfriendedPersons(cb) {
			var userService = $injector.get("ssn.userService");
			step(function () {
				userService.getMultiple(removed, this);
			}, h.sF(function (removedFriends) {
				var toCall = removedFriends.map(function (friend) {
					return function () {
						checkAndRemove(friend.getID(), this);
					};
				});
				toCall.push(this);

				step.apply(null, toCall);
			}), cb);
		}

		var loadingPromise;

		friendsService = {
			isLoaded: function () {
				return loadingPromise.isFulfilled();
			},
			ensureIsLoaded: function (method) {
				if (!friendsService.isLoaded()) {
					throw new Error("friends service not yet loaded! Method: " + method);
				}
			},
			awaitLoading: function (cb) {
				return loadingPromise.nodeify(cb);
			},
			getUserFriends: function (uid, cb) {
				step(function () {
					socket.emit("friends.getUser", {
						userid: uid
					}, this);
				}, h.sF(function (result) {
					this.ne(result.friends);
				}), cb);
			},
			removeFriend: function (uid, cb) {
				friendsService.ensureIsLoaded("removeFriend");

				if (friends.indexOf(uid) === -1 && removed.indexOf(uid) === -1) {
					throw new Error("not a friend!");
				}

				var userService = $injector.get("ssn.userService"), circleService = $injector.get("ssn.circleService");
				var otherUser, ownUser = userService.getown(), circles;

				step(function () {
					userService.get(uid, this);
				}, h.sF(function (u) {
					otherUser = u;

					generateRemovalData(ownUser, otherUser, this);
				}), h.sF(function (signedRemoval, signedList, signedKeys, newFriendsKey) {
					socket.emit("friends.remove", {
						uid: uid,
						signedRemoval: signedRemoval,
						signedList: signedList,
						signedKeys: signedKeys,
						newFriendsKey: keyStore.upload.getKey(newFriendsKey)
					}, this);
				}), h.sF(function (result) {
					if (result.success) {
						h.removeArray(friends, uid);
						h.removeArray(removed, uid);

						updateCounters();
						friendsService.notify(uid, "remove");
						userOnline(uid, -1);

						circleService.loadAll(this);
					} else {
						throw new Error("could not remove friends");
					}
				}), h.sF(function () {
					//get all circles this user is in!
					circles = circleService.inWhichCircles(uid);
					circles.forEach(function (circle) {
						circle.removePersons([uid], this.parallel());
					}, this);
					this.parallel()();
				}), h.sF(function () {
					//remove user from circles
					var scopes = circles.map(function (c) { return "circle:" + c.getID(); });
					scopes.push("always:allfriends");
					//update profile for new friendsKey
					ownUser.rebuildProfiles(this);
				}), cb);
			},
			friendship: function (uid, cb) {
				if (h.containsOr(uid, friends, requested)) {
					return;
				}

				addAsFriend(uid, cb);
			},
			ignoreFriendShip: function (uid, cb) {
				step(function () {
					if (requests.indexOf(uid) > -1 && !h.containsOr(uid, friends, requested)) {
						socket.emit("friends.ignore", { uid: uid }, this);
					} else {
						throw new Error("no request Oo");
					}
				}, h.sF(function () {
					ignored.push(uid);
					h.removeArray(requests, uid);
					friendsService.notify(uid, "ignore");
					updateCounters();

					this.ne();
				}), cb);
			},
			acceptFriendShip: function (uid, cb) {
				if (requests.indexOf(uid) > -1 && !h.containsOr(uid, friends, requested)) {
					addAsFriend(uid, cb);
				}
			},
			didIRequest: function (uid) {
				friendsService.ensureIsLoaded("didIRequest");

				return h.containsOr(uid, friends, requested);
			},
			didOtherRequest: function (uid) {
				friendsService.ensureIsLoaded("didOtherRequest");

				return h.containsOr(uid, friends, requests);
			},
			areFriends: function (uid) {
				friendsService.ensureIsLoaded("areFriends");

				return h.containsOr(uid, friends);
			},
			noRequests: function (uid) {
				friendsService.ensureIsLoaded("noRequests");

				return !h.containsOr(uid, friends, requested, requests);
			},
			getRequestStatus: function (uid) {
				friendsService.ensureIsLoaded("getRequestStatus");

				if (friends.indexOf(uid) > -1) {
					return "friends";
				}

				if (requested.indexOf(uid) > -1) {
					return "requested";
				}

				if (requests.indexOf("uid") > -1) {
					return "accept";
				}

				return "request";
			},
			getRequests: function () {
				friendsService.ensureIsLoaded("getRequests");

				return requests.slice();
			},
			getFriends: function () {
				friendsService.ensureIsLoaded("getFriends");

				return friends.slice();
			},
			getRequested: function () {
				friendsService.ensureIsLoaded("getRequested");

				return requested.slice();
			},
			getUserFriendShipKey: function (uid) {
				friendsService.ensureIsLoaded("getUserFriendShipKey");

				return signedList.metaAttr(uid);
			},
			getUserForKey: function (realid) {
				friendsService.ensureIsLoaded("getUserForKey");

				var meta = signedList.metaGet(), result;
				h.objectEach(meta, function (key, value) {
					if (value === realid) {
						result = h.parseDecimal(key);
					}
				});

				return result;
			},
			getAllFriendShipKeys: function () {
				friendsService.ensureIsLoaded("getAllFriendShipKeys");

				var meta = signedList.metaGet(), keys = [];
				h.objectEach(meta, function (key, value) {
					if (h.isInt(key)) {
						keys.push(value);
					}
				});

				return keys;
			},
			load: function () {
				var userService = $injector.get("ssn.userService");

				return socket.definitlyEmit("friends.all", {}).then(function (data) {
					friends = data.friends.map(h.parseDecimal);
					requests = data.requests.map(h.parseDecimal);
					requested = data.requested.map(h.parseDecimal);
					ignored = data.ignored.map(h.parseDecimal);
					removed = data.removed.map(h.parseDecimal);
					deleted = data.deleted.map(h.parseDecimal);

					updateCounters();

					signedList = SecuredData.load(undefined, data.signedList || {}, { type: "signedFriendList" });

					var requestedOrFriends = signedList.metaKeys().map(h.parseDecimal);
					if (!h.arrayEqual(requestedOrFriends, requested.concat(friends).concat(removed).concat(deleted))) {
						throw new Error("unmatching arrays");
					}

					return userService.verifyOwnKeysDone().thenReturn(data);
				}).then(function (data) {
					if (data.signedList) {
						return signedList.verify(userService.getown().getSignKey(), "user");
					}
				}).then(function () {
					var requestedOrFriends = signedList.metaKeys().map(h.parseDecimal);
					requestedOrFriends.forEach(function (uid) {
						keyStore.security.addEncryptionIdentifier(signedList.metaAttr(uid));
					});

					if (removed.length > 0) {
						var removeUnfriendedPersonsAsync = Bluebird.promisify(removeUnfriendedPersons);
						return removeUnfriendedPersonsAsync();
					}
				});
			},
			onlineStatus: function (uid) {
				if (friends.indexOf(uid) === -1) {
					return -1;
				}

				return onlineFriends[uid] || 0;
			},
			reset: function () {
				friends = [];
				requests = [];
				requested = [];
				ignored = [];
				removed = [];
				deleted = [];
				onlineFriends = {};
			},
			data: friendsData
		};

		Observer.call(friendsService);

		loadingPromise = initService.awaitLoading().then(function () {
			return friendsService.load();
		});

		initService.awaitLoading().then(function () {
			return Bluebird.delay(500);
		}).then(function () {
				return socket.definitlyEmit("friends.getOnline", {});
		}).then(function (data) {
			h.objectEach(data.online, function (uid, status) {
				userOnline(uid, status);
			});
		});

		$rootScope.$on("ssn.reset", function () {
			friendsService.reset();
		});

		socket.channel("notify.signedList", function (e, data) {
			if (signedList.metaAttr("_signature") !== data._signature) {
				var userService = $injector.get("ssn.userService");
				var updatedSignedList = SecuredData.load(undefined, data, { type: "signedFriendList" });

				step(function () {
					updatedSignedList.verify(userService.getown().getSignKey(), this, "user");
				}, h.sF(function () {
					signedList = updatedSignedList;
				}), function (e) {
					throw e;
				});
			}
		});

		return friendsService;
	};

	service.$inject = ["$rootScope", "$injector", "ssn.socketService", "ssn.sessionService", "ssn.keyStoreService", "ssn.initService"];

	serviceModule.factory("ssn.friendsService", service);
});
