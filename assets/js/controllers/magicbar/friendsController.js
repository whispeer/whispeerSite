/**
* requestsController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function requestsController($scope, friendsService, userService)  {
		//friendsService.onEvent("friendRequest", loadRequestsUsers);
		//friendsService.onEvent("requestAccept", loadRequestsUsers);

		function loadRequestsUsers() {
			step(function () {
				var requests = friendsService.getRequests();
				userService.getMultipleFormatted(requests, this);
			}, h.sF(function (result) {
				$scope.requests = result;
			}));
		}

		loadRequestsUsers();

		$scope.acceptRequest = function (request) {
			friendsService.acceptFriendShip(request.id);
		};

		$scope.shortenName = function (name) {
			if(name.length > 17) {
				return name.substr(0, 17) + "..";
			} else {
				return name;
			}
		};
		$scope.requests = [];
	}

	requestsController.$inject = ["$scope", "ssn.friendsService", "ssn.userService"];

	return requestsController;
});