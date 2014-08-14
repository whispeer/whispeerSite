/**
* friendsService
**/
define(["step", "whispeerHelper", "asset/observer", "asset/securedDataWithMetaData"], function (step, h, Observer, SecuredData) {
	"use strict";

	/*
		friendship:

		SecuredData(undefined, {
			friend: uid
		})
	*/

	var service = function ($rootScope, $injector, socket, sessionService, keyStore, initService) {
		var friends = [], requests = [], requested = [], signedList, onlineFriends = {};
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
					friend: otherUser.getID()
				}, { type: "friendShip" }).sign(ownUser.getSignKey(), this.parallel());

				var listData = {};
				listData[otherUser.getID()] = friendShipKey;
				signedList.metaJoin(listData);
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

		function acceptFriendShip(uid, cb) {
			var otherLevel2Key, ownLevel2Key, friendsKey, otherFriendsKey, friendShipKey, otherUser, userService = $injector.get("ssn.userService");
			var own = userService.getown();
			step(function () {
				userService.get(uid, this);
			}, h.sF(function (_otherUser) {
				otherUser = _otherUser;

				otherLevel2Key = otherUser.getFriendsLevel2Key();
				otherFriendsKey = otherUser.getFriendsKey();
				ownLevel2Key = own.getFriendsLevel2Key();
				friendsKey = own.getFriendsKey();

				keyStore.sym.symEncryptKey(otherLevel2Key, friendsKey, this.parallel());
				keyStore.sym.symEncryptKey(ownLevel2Key, otherFriendsKey, this.parallel());
			}), h.sF(function () {
				createBasicData(own, otherUser, this);
			}), h.sF(function (data, _friendShipKey) {
				friendShipKey = _friendShipKey;
				data.decryptors = keyStore.upload.getDecryptors([friendsKey, otherLevel2Key, ownLevel2Key], [friendsKey, otherFriendsKey, friendShipKey]);

				socket.emit("friends.add", data, this);
			}), h.sF(function (result) {
				if (result.friendAdded) {
					friends.push(uid);
					h.removeArray(requests, uid);
					updateCounters();

					otherUser.setFriendShipKey(friendShipKey);

					userOnline(uid, result.friendOnline);

					friendsService.notify(uid, "newFriend");

					this.ne();
				} else {
					throw new Error("friend adding failed!");
				}
			}), cb);
			//get own friendsKey
			//get others friendsLevel2Key
			//get own friendsLevel2Key
		}

		function requestFriendShip(uid, cb) {
			var otherUser, friendShipKey, userService = $injector.get("ssn.userService");
			step(function () {
				userService.get(uid, this);
			}, h.sF(function (u) {
				otherUser = u;
				createBasicData(userService.getown(), otherUser, this);
			}), h.sF(function (data, _friendShipKey) {
				friendShipKey = _friendShipKey;

				var friendsKey = userService.getown().getFriendsKey();
				data.decryptors = keyStore.upload.getDecryptors([friendsKey], [friendShipKey]);

				socket.emit("friends.add", data, this);
			}), h.sF(function (result) {
				if (result.friendAdded) {
					otherUser.setFriendShipKey(friendShipKey);
					requested.push(uid);
					friendsService.notify(uid, "newRequested");
				} else {
					//user requested friendShip and we did not get it when we started this...
					acceptFriendShip(uid, cb);
				}
			}), cb);
		}

		socket.listen("friendRequest", function (e, requestData) {
			var uid = parseInt(requestData.uid, 10);
			if (!h.containsOr(uid, requests, friends, requested))  {
				requests.push(uid);
				updateCounters();

				friendsService.notify(uid, "newRequest");
			}
		});

		socket.listen("friendAccept", function (e, requestData) {
			var uid = parseInt(requestData.uid, 10);
			if (!h.containsOr(uid, requests, friends))  {
				friends.push(uid);
				h.removeArray(requested, uid);

				updateCounters();

				friendsService.notify(uid, "newFriend");

				userOnline(uid, 2);
			}
		});

		socket.listen("friendOnlineChange", function (e, requestData) {
			var uid = requestData.uid;
			var status = requestData.status;

			userOnline(uid, status);
		});

		var friendsService = {
			getUserFriends: function (uid, cb) {
				step(function () {
					socket.emit("friends.getUser", {
						userid: uid
					}, this);
				}, h.sF(function (result) {
					this.ne(result.friends);
				}), cb);
			},
			friendship: function (uid, cb) {
				if (h.containsOr(uid, friends, requested)) {
					return;
				}

				if (requests.indexOf(uid) > -1) {
					acceptFriendShip(uid, cb);
				} else {
					requestFriendShip(uid, cb);
				}
			},
			acceptFriendShip: function (uid, cb) {
				if (requests.indexOf(uid) > -1 && !h.containsOr(uid, friends, requested)) {
					acceptFriendShip(uid, cb);
				}
			},
			didIRequest: function (uid) {
				return h.containsOr(uid, friends, requested);
			},
			didOtherRequest: function (uid) {
				return h.containsOr(uid, requests);
			},
			areFriends: function (uid) {
				return h.containsOr(uid, friends);
			},
			noRequests: function (uid) {
				return !h.containsOr(uid, friends, requested, requests);
			},
			getRequestStatus: function (uid) {
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
				return requests.slice();
			},
			getFriends: function () {
				return friends.slice();
			},
			getRequested: function () {
				return requested.slice();
			},
			getUserFriendShipKey: function (uid) {
				return signedList.metaAttr(uid);
			},
			load: function (data, cb) {
				var userService = $injector.get("ssn.userService");

				friends = data.friends.map(h.parseDecimal);
				requests = data.requests.map(h.parseDecimal);
				requested = data.requested.map(h.parseDecimal);

				updateCounters();

				signedList = SecuredData.load(undefined, data.signedList || {}, { type: "signedFriendList" });

				var requestedOrFriends = signedList.metaKeys().map(h.parseDecimal);
				if (!h.arrayEqual(requestedOrFriends, requested.concat(friends))) {
					throw new Error("unmatching arrays");
				}

				step(function () {
					if (!data.signedList) {
						this.last.ne();
					} else {
						signedList.verify(userService.getown().getSignKey(), this);
					}
				}, h.sF(function () {
					requestedOrFriends.forEach(function (uid) {
						keyStore.security.addEncryptionIdentifier(signedList.metaAttr(uid));
					});

					this.ne();
				}), cb);
			},
			onlineStatus: function (uid) {
				if (friends.indexOf(uid) === -1) {
					return -1;
				}

				return onlineFriends[uid] || 0;
			},
			setOnline: function (online) {
				onlineFriends = online;
			},
			reset: function () {
				friends = [];
				requests = [];
				requested = [];
				onlineFriends = [];
			},
			data: friendsData
		};

		Observer.call(friendsService);

		initService.register("friends.all", {}, function (data, cb) {
			friendsService.load(data, cb);
		});

		initService.register("friends.getOnline", {}, function (data, cb) {
			friendsService.setOnline(data.online);
			cb();
		});

		$rootScope.$on("ssn.reset", function () {
			friendsService.reset();
		});

		return friendsService;
	};

	service.$inject = ["$rootScope", "$injector", "ssn.socketService", "ssn.sessionService", "ssn.keyStoreService", "ssn.initService"];

	return service;
});