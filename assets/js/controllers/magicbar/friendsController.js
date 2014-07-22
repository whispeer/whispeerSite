/**
* requestsController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function requestsController($scope, friendsService, userService)  {
		$scope.requests = [];
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

		friendsService.listen(loadRequestsUsers);
		loadRequestsUsers();

		$scope.acceptRequest = function (request) {
			request.user.acceptFriendShip();
		};

		$scope.shortenName = function (name) {
			if(name.length > 17) {
				return name.substr(0, 17) + "..";
			} else {
				return name;
			}
		};
	}

	requestsController.$inject = ["$scope", "ssn.friendsService", "ssn.userService"];

	return requestsController;
});