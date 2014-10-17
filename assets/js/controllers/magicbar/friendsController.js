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
	}

	requestsController.$inject = ["$scope", "ssn.friendsService", "ssn.userService"];

	return requestsController;
});