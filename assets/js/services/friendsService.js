/**
* friendsService
**/
define(["whispeerHelper", "asset/observer", "asset/securedDataWithMetaData", "services/serviceModule", "bluebird"], function (h, Observer, SecuredData, serviceModule, Bluebird) {
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

		function createBasicData(ownUser, otherUser) {
			var friendShipKey;

			//encr intermediate key w/ users cryptKey
			return keyStore.sym.asymEncryptKey(
				ownUser.getFriendsKey(),
				otherUser.getCryptKey()
			).then(function (_friendShipKey) {
				friendShipKey = _friendShipKey;
				var mainKey = ownUser.getMainKey();

				signedList.metaSetAttr(otherUser.getID(), friendShipKey);

				return Bluebird.all([
					SecuredData.load(undefined, {
						user: otherUser.getID()
					}, { type: "friendShip" }).sign(ownUser.getSignKey()),

					signedList.sign(ownUser.getSignKey()),

					keyStore.sym.symEncryptKey(friendShipKey, mainKey)
				]);
			}).spread(function (securedData, signedList) {
				var data = {
					signedList: signedList,
					meta: securedData,
					key: keyStore.upload.getKey(friendShipKey)
				};

				return {
					data: data,
					key: friendShipKey
				};
			});
		}

		function generateRemovalData(ownUser, otherUser) {
			return Bluebird.try(function () {
				var signedRemovalPromise = SecuredData.load(undefined, {
					initial: removed.indexOf(ownUser.getID()) === -1,
					user: otherUser.getID()
				}, { type: "removeFriend" }).sign(ownUser.getSignKey()	);

				signedList.metaRemoveAttr(otherUser.getID());

				var signedListPromise = signedList.sign(ownUser.getSignKey());

				return Bluebird.all([
					signedRemovalPromise,
					signedListPromise
				]);
			}).spread(function (signedRemoval, updatedSignedList) {
				return ownUser.generateNewFriendsKey().then(function (result) {
					return {
						signedRemoval: signedRemoval,
						updatedSignedList: updatedSignedList,
						signedKeys: result.updatedSignedKeys,
						newFriendsKey: result.newFriendsKey
					};
				});
			});
		}

		function addAsFriend(uid) {
			var otherUser, friendShipKey, userService = $injector.get("ssn.userService");
			return Bluebird.try(function () {
				return friendsService.awaitLoading();
			}).then(function () {
				return userService.get(uid);
			}).then(function (u) {
				otherUser = u;
				return createBasicData(userService.getown(), otherUser);
			}).then(function (result) {
				friendShipKey = result.key;

				var friendsKey = userService.getown().getFriendsKey();
				result.data.decryptors = keyStore.upload.getDecryptors([friendsKey], [friendShipKey]);

				return socket.emit("friends.add", result.data);
			}).then(function (result) {
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
				}
			});
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

		function checkAndRemove(uid) {
			var userService = $injector.get("ssn.userService");
			return Bluebird.try(function () {
				return Bluebird.all([
					userService.get(uid),
					socket.emit("friends.getSignedData", {
						uid: uid
					})
				]);
			}).spread(function (user, data) {
				var signedData = data.signedData;
				if (h.parseDecimal(signedData.user) !== userService.getown().getID() || signedData.initial === "false") {
					throw new Error("invalid signed removal");
				}

				return SecuredData.load(undefined, signedData, { type: "removeFriend" }).verify(user.getSignKey());
			}).then(function () {
				return friendsService.removeFriend(uid, null, true);
			});
		}

		function removeUnfriendedPersons() {
			var userService = $injector.get("ssn.userService");
			return Bluebird.try(function () {
				return userService.getMultiple(removed);
			}).then(function (removedFriends) {
				return removedFriends.reduce(function (previousPromise, friend) {
					return previousPromise.then(function () {
						return checkAndRemove(friend.getID());
					});
				}, Bluebird.resolve());
			});
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
				return Bluebird.try(function () {
					return socket.emit("friends.getUser", {
						userid: uid
					});
				}).then(function (result) {
					return result.friends;
				}).nodeify(cb);
			},
			removeFriend: function (uid, cb, ignoreIsLoadedCheck) {
				if (!ignoreIsLoadedCheck) {
					friendsService.ensureIsLoaded("removeFriend");
				}

				if (friends.indexOf(uid) === -1 && removed.indexOf(uid) === -1) {
					throw new Error("not a friend!");
				}

				var userService = $injector.get("ssn.userService"), circleService = $injector.get("ssn.circleService");
				var otherUser, ownUser = userService.getown(), userCircles = circleService.inWhichCircles(uid);

				return Bluebird.try(function () {
					return userService.get(uid);
				}).then(function (u) {
					otherUser = u;

					return generateRemovalData(ownUser, otherUser, this);
				}).then(function (result) {
					return socket.emit("friends.remove", {
						uid: uid,
						signedRemoval: result.signedRemoval,
						signedList: result.updatedSignedList,
						signedKeys: result.signedKeys,
						newFriendsKey: keyStore.upload.getKey(result.newFriendsKey)
					});
				}).then(function (result) {
					if (result.success) {
						h.removeArray(friends, uid);
						h.removeArray(removed, uid);

						updateCounters();
						friendsService.notify(uid, "remove");
						userOnline(uid, -1);

						return circleService.loadAll();
					}

					throw new Error("could not remove friends");
				}).then(function () {
					return Bluebird.all(userCircles.map(function (circle) {
						return circle.removePersons([uid]);
					}));
				}).then(function () {
					//update profile for new friendsKey
					return ownUser.rebuildProfiles();
				}).nodeify(cb);
			},
			friendship: function (uid, cb) {
				if (h.containsOr(uid, friends, requested)) {
					return Bluebird.resolve().nodeify(cb);
				}

				return addAsFriend(uid).nodeify(cb);
			},
			ignoreFriendShip: function (uid, cb) {
				return Bluebird.try(function () {
					if (requests.indexOf(uid) > -1 && !h.containsOr(uid, friends, requested)) {
						return socket.emit("friends.ignore", { uid: uid });
					}

					throw new Error("no request Oo");
				}).then(function () {
					ignored.push(uid);
					h.removeArray(requests, uid);
					friendsService.notify(uid, "ignore");
					updateCounters();
				}).nodeify(cb);
			},
			acceptFriendShip: function (uid, cb) {
				if (requests.indexOf(uid) > -1 && !h.containsOr(uid, friends, requested)) {
					return addAsFriend(uid).nodeify(cb);
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
						return removeUnfriendedPersons();
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

				Bluebird.try(function () {
					return updatedSignedList.verify(userService.getown().getSignKey(), null, "user");
				}).then(function () {
					signedList = updatedSignedList;
				});
			}
		});

		return friendsService;
	};

	service.$inject = ["$rootScope", "$injector", "ssn.socketService", "ssn.sessionService", "ssn.keyStoreService", "ssn.initService"];

	serviceModule.factory("ssn.friendsService", service);
});
