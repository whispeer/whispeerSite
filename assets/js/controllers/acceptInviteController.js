define(["whispeerHelper", "step", "asset/state", "controllers/controllerModule"], function (h, step, State, controllerModule) {
	"use strict";

	function acceptInviteController($scope, cssService, socketService, errorService) {
		cssService.setClass("acceptInviteView");

		var acceptInviteState = new State();
		$scope.acceptInviteState = acceptInviteState.data;

		$scope.code = "";
		$scope.accept = function () {
			acceptInviteState.pending();

			step(function () {
				socketService.emit("invites.acceptRequest", {
					code: $scope.code
				}, this);
			}, h.sF(function (data) {
				if (!data.success) {
					throw new Error("nope!");
				} else {
					this.ne();
				}
			}), errorService.failOnError(acceptInviteState));
		};
	}

	acceptInviteController.$inject = ["$scope", "ssn.cssService", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.acceptInviteController", acceptInviteController);
});
