define(["whispeerHelper", "step", "asset/state"], function (h, step, State) {
	"use strict";

	function versionController($scope, cssService, socketService, errorService) {
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

	versionController.$inject = ["$scope", "ssn.cssService", "ssn.socketService", "ssn.errorService"];

	return versionController;
});