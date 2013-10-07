/**
* friendsService
**/
define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var service = function ($rootScope) {
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

		function acceptFriendShip(uid) {
			//get own friendsKey
			//get others friendsLevel2Key
			//get own friendsLevel2Key
		}

		function requestFriendShip(uid) {
			//own user get friendsKey
			//generate another intermediate key
			//encr friendsKey w/ intermediate key
			//encr intermediate key w/ users cryptKey
			//sign: friendShip:uid:nickname
		}

		var friendsService = {
			friendship: function (uid) {
				if (friends.indexOf(uid) > -1 || requested.indexOf(uid) -1) {
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

	service.$inject = ["$rootScope"];

	return service;
});