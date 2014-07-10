/**
* friendsService
**/
define(["step", "whispeerHelper", "asset/observer"], function (step, h, Observer) {
	"use strict";

	var service = function ($rootScope, $injector, socket, sessionService, keyStore, initService) {
		var friends = [], requests = [], requested = [], onlineFriends = {};
		var friendsData = {
			requestsCount: 0,
			friendsCount: 0,
			requestedCount: 0
		};

		function setFriends(f) {
			friends = f.map(function (e) {return h.parseDecimal(e);});
			friendsData.friendsCount = f.length;
		}

		function setRequests(r) {
			requests = r.map(function (e) {return h.parseDecimal(e);});
			friendsData.requestsCount = r.length;
		}

		function setRequested(r) {
			requested = r.map(function (e) {return h.parseDecimal(e);});
			friendsData.requestedCount = r.length;
		}

		function createBasicData(otherUser, cb) {
			var friendsKey, signature, friendShipKey, userService = $injector.get("ssn.userService");
			step(function () {
				this.parallel.unflatten();

				var own = userService.getown();
				//own user get friendsKey
				friendsKey = own.getFriendsKey();
				var crypt = otherUser.getCryptKey();

				//sign: friendShip:uid:nickname
				keyStore.sign.signText("friendship:" + otherUser.getID() + ":" + otherUser.getNickname(), own.getSignKey(), this.parallel());
				//encr intermediate key w/ users cryptKey
				keyStore.sym.asymEncryptKey(friendsKey, crypt, this.parallel());
			}, h.sF(function (sign, friendshipK) {
				signature = sign;
				friendShipKey = friendshipK;

				var mainKey = userService.getown().getMainKey();

				keyStore.sym.symEncryptKey(friendshipK, mainKey, this.parallel());
			}), h.sF(function () {
				var data = {
					userid: otherUser.getID(),
					signedRequest: signature,
					key: keyStore.upload.getKey(friendShipKey)
				};

				this.ne(data, friendShipKey);
			}), cb);
		}

		function acceptFriendShip(uid) {
			var otherLevel2Key, ownLevel2Key, friendsKey, otherFriendsKey, friendShipKey, otherUser, userService = $injector.get("ssn.userService");
			step(function () {
				userService.get(uid, this);
			}, h.sF(function (u) {
				otherUser = u;

				var own = userService.getown();
				createBasicData(otherUser, this.parallel());

				otherLevel2Key = otherUser.getFriendsLevel2Key();
				otherFriendsKey = otherUser.getFriendsKey();

				ownLevel2Key = own.getFriendsLevel2Key();
				friendsKey = own.getFriendsKey();

				keyStore.sym.symEncryptKey(otherLevel2Key, friendsKey, this.parallel());
				keyStore.sym.symEncryptKey(ownLevel2Key, otherFriendsKey, this.parallel());
			}), h.sF(function (data, fskey) {
				data = data[0];
				friendShipKey = fskey[0];
				data.decryptors = keyStore.upload.getDecryptors([friendsKey, otherLevel2Key, ownLevel2Key], [friendsKey, otherFriendsKey, data.key.realid]);

				socket.emit("friends.add", data, this);
			}), h.sF(function (result) {
				if (result.friendAdded) {
					friends.push(uid);
					friendsData.friendsCount += 1;
					friendsData.requestsCount -= 1;
					h.removeArray(requests, uid);

					otherUser.setFriendShipKey(friendShipKey);

					onlineFriends[uid] = result.friendOnline;
					friendsService.notify(result.friendOnline, "online:" + uid);

					friendsService.notify(uid, "newFriend");
				} else {
					console.error("friend adding failed!");
					//oh noes!
				}
			}));
			//get own friendsKey
			//get others friendsLevel2Key
			//get own friendsLevel2Key
		}

		function requestFriendShip(uid) {
			var otherUser, friendShipKey, userService = $injector.get("ssn.userService");
			step(function () {
				userService.get(uid, this);
			}, h.sF(function (u) {
				otherUser = u;
				createBasicData(otherUser, this);
			}), h.sF(function (data, fsKey) {
				friendShipKey = fsKey;
				var friendsKey = userService.getown().getFriendsKey();
				data.decryptors = keyStore.upload.getDecryptors([friendsKey], [data.key.realid]);

				socket.emit("friends.add", data, this);
			}), h.sF(function (result) {
				if (!result.error) {
					if (result.friendAdded) {
						otherUser.setFriendShipKey(friendShipKey);
						requested.push(uid);
						friendsService.notify(uid, "newRequested");
					} else {
						//user requested friendShip and we did not get it when we started this...
						acceptFriendShip(uid);
					}
				}
			}));
		}

		socket.listen("friendRequest", function (e, requestData) {
			var uid = parseInt(requestData.uid, 10), userService = $injector.get("ssn.userService");
			if (requests.indexOf(uid) === -1 && friends.indexOf(uid) === -1 && requested.indexOf(uid) === -1)  {
				requests.push(uid);
				friendsData.requestsCount += 1;
				userService.addFromData(requestData.user, true);
				friendsService.notify(uid, "newRequest");
			}
		});

		socket.listen("friendAccept", function (e, requestData) {
			var uid = parseInt(requestData.uid, 10), userService = $injector.get("ssn.userService");
			if (requests.indexOf(uid) === -1 && friends.indexOf(uid) === -1)  {
				friends.push(uid);
				friendsData.friendsCount += 1;
				requestData.requestedCount -= 1;

				userService.addFromData(requestData.user, true);
				friendsService.notify(uid, "newFriend");

				onlineFriends[uid] = 2;
			}
		});

		socket.listen("friendOnlineChange", function (e, requestData) {
			var uid = requestData.uid;
			var status = requestData.status;

			onlineFriends[uid] = status;
			friendsService.notify(status, "online:" + uid);
		});

		var friendsService = {
			getUserFriends: function (uid, cb) {
				step(function () {
					socket.emit("friends.getUser", {
						userid: uid
					}, this);
				}, h.sF(function (result) {
					if (!result.error) {
						this.ne(result.friends);
					} else {
						throw new Error("server returned an error!");
					}
				}), cb);
			},
			friendship: function (uid) {
				if (friends.indexOf(uid) > -1 || requested.indexOf(uid) > -1) {
					return;
				}

				if (requests.indexOf(uid) > -1) {
					acceptFriendShip(uid);
				} else {
					requestFriendShip(uid);
				}
			},
			acceptFriendShip: function (uid) {
				if (requests.indexOf(uid) > -1 && friends.indexOf(uid) === -1 && requested.indexOf(uid) === -1) {
					acceptFriendShip(uid);
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
			load: function (data) {
				setFriends(data.friends);
				setRequests(data.requests);
				setRequested(data.requested);
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
			},
			data: friendsData
		};

		Observer.call(friendsService);

		initService.register("friends.getAll", {}, function (data, cb) {
			friendsService.load(data);
			cb();
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