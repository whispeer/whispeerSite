define(["whispeerHelper", "step", "asset/state"], function (h, step, State) {
	"use strict";

	function recoveryController($scope, socketService, cssService, errorService) {
		cssService.setClass("recoveryView");

		var requestState = new State();

		$scope.request = {
			identifier: "",
			state: requestState.data,
			execute: function (identifier) {
				requestState.pending();

				step(function () {
					socketService.emit("recovery.request", { identifier: identifier }, this);
				}, errorService.failOnError(requestState));
			}
		};
	}

	recoveryController.$inject = ["$scope", "ssn.socketService", "ssn.cssService", "ssn.errorService"];

	return recoveryController;
});