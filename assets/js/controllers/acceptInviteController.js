var cssService = require("services/css.service").default;
var errorService = require("services/error.service").errorServiceInstance;
var socketService = require("services/socket.service").default;

define(["bluebird", "asset/state", "controllers/controllerModule"], function (Bluebird, State, controllerModule) {
	"use strict";

	function acceptInviteController($scope) {
		cssService.setClass("acceptInviteView");

		var acceptInviteState = new State.default();
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

	acceptInviteController.$inject = ["$scope"];

	controllerModule.controller("ssn.acceptInviteController", acceptInviteController);
});
