
define(["bluebird", "asset/state", "controllers/controllerModule"], function (Bluebird, State, controllerModule) {
	"use strict";

	function acceptInviteController($scope, cssService, socketService, errorService) {
		cssService.setClass("acceptInviteView");

		var acceptInviteState = new State();
		$scope.acceptInviteState = acceptInviteState.data;

		$scope.code = "";
		$scope.accept = function () {
			acceptInviteState.pending();

			var acceptInvitePromise = socketService.emit("invites.acceptRequest", {
				code: $scope.code
			}).then(function(data) {
				if (!data.success) {
					throw new Error("nope!");
				}
			});

			return errorService.failOnErrorPromise(acceptInviteState, acceptInvitePromise);
		};
	}

	acceptInviteController.$inject = ["$scope", "ssn.cssService", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.acceptInviteController", acceptInviteController);
});
