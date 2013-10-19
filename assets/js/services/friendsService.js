/**
* friendsService
**/
define(["step", "whispeerHelper", "asset/observer"], function (step, h, Observer) {
	"use strict";

	var service = function ($rootScope, socket, sessionService, userService, keyStore) {
		var friends = [], requests = [], requested = [];
		var friendsData = {
			requestsCount: 0,
			friendsCount: 0,
			requestedCount: 0
		};

		function setFriends(f) {
			friends = f.map(function (e) {return parseInt(e, 10);});
			friendsData.friendsCount = f.length;
		}

		function setRequests(r) {
			requests = r.map(function (e) {return parseInt(e, 10);});
			friendsData.requestsCount = r.length;
		}

		function setRequested(r) {
			requested = r.map(function (e) {return parseInt(e, 10);});
			friendsData.requestedCount = r.length;
		}

		function createBasicData(otherUser, cb) {
			var friendsKey;
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
			}, h.sF(function (signature, cryptKey) {
				var data = {
					userid: otherUser.getID(),
					signedRequest: signature,
					key: keyStore.upload.getKey(cryptKey)
				};

				this.ne(data);
			}), cb);
		}

		function acceptFriendShip(uid) {
			var otherLevel2Key, ownLevel2Key, friendsKey;
			step(function () {
				userService.get(uid, this);
			}, h.sF(function (otherUser) {
				this.parallel.unflatten();

				var own = userService.getown();
				createBasicData(otherUser, this.parallel());

				otherLevel2Key = otherUser.getFriendsLevel2Key();
				var otherFriendsKey = otherUser.getFriendsKey();

				ownLevel2Key = own.getFriendsLevel2Key();
				friendsKey = own.getFriendsKey();

				keyStore.sym.symEncryptKey(otherLevel2Key, friendsKey, this.parallel());
				keyStore.sym.symEncryptKey(ownLevel2Key, otherFriendsKey, this.parallel());
			}), h.sF(function (data) {
				data.decryptors = keyStore.upload.getDecryptors([friendsKey, otherLevel2Key, ownLevel2Key]);

				socket.emit("friends.add", data, this);
			}), h.sF(function (result) {
				if (result.friendAdded) {
					friends.push(uid);
					friendsData.friendsCount += 1;
					friendsData.requestsCount -= 1;
					h.removeArray(requests, uid);
					friendsService.notify("newFriend", uid);
				} else {
					//oh noes!
				}
			}));
			//get own friendsKey
			//get others friendsLevel2Key
			//get own friendsLevel2Key
		}

		function requestFriendShip(uid) {
			step(function () {
				userService.get(uid, this);
			}, h.sF(function (otherUser) {
				createBasicData(otherUser, this);
			}), h.sF(function (data) {
				var friendsKey = userService.getown().getFriendsKey();
				data.decryptors = keyStore.upload.getDecryptors([friendsKey]);

				socket.emit("friends.add", data, this);
			}), h.sF(function (result) {
				if (!result.error) {
					if (result.friendAdded) {
						requested.push(uid);
						friendsService.notify("newRequested", uid);
					} else {
						//user requested friendShip and we did not get it when we started this...
						acceptFriendShip(uid);
					}
				}
			}));
		}

		socket.listen("friendRequest", function (e, requestData) {
			var uid = parseInt(requestData.uid, 10);
			if (requests.indexOf(uid) === -1 && friends.indexOf(uid) === -1 && requested.indexOf(uid) === -1)  {
				requests.push(uid);
				friendsData.requestsCount += 1;
				userService.addFromData(requestData.user, true);
				friendsService.notify("newRequest", uid);
			}
		});

		socket.listen("friendAccept", function (e, requestData) {
			var uid = parseInt(requestData.uid, 10);
			if (requests.indexOf(uid) === -1 && friends.indexOf(uid) === -1)  {
				friends.push(uid);
				friendsData.friendsCount += 1;
				requestData.requestedCount -= 1;
				userService.addFromData(requestData.user, true);
				friendsService.notify("newFriend", uid);
			}
		});

		var friendsService = {
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
			reset: function () {
				friends = [];
				requests = [];
				requested = [];
			},
			data: friendsData
		};

		Observer.call(friendsService);

		$rootScope.$on("ssn.ownLoaded", function (evt, data) {
			friendsService.load(data.friends.getAll);
		});

		$rootScope.$on("ssn.reset", function () {
			friendsService.reset();
		});

		return friendsService;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.sessionService", "ssn.userService", "ssn.keyStoreService"];

	return service;
});