/**
* friendsService
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($rootScope, socket, sessionService, userService, keyStore) {
		var friends = [], requests = [], requested = [];
		var data = {
			requestsCount: 0,
			friendsCount: 0,
			requestedCount: 0
		};

		function setFriends(f) {
			friends = f;
			data.friendsCount = f.length;
		}

		function setRequests(r) {
			requests = r;
			data.requestsCount = r.length;
		}

		function setRequested(r) {
			requested = r;
			data.requestedCount = r.length;
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
				if (result.success) {
					friends.push(uid);
					h.removeArray(requests, uid);
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
					if (result.success) {
						requested.push(uid);
					} else {
						//user requested friendShip and we did not get it when we started this...
						acceptFriendShip(uid);
					}
				}
			}));
		}

		socket.listen("friendRequest", function (e, data) {
			debugger;
		});

		socket.listen("friendAccept", function (e, data) {
			debugger;
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
			data: data
		};

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