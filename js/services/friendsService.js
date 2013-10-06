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

		var friendsService = {
			requestFriendShip: function (uid) {
				step(function () {
					
				});
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