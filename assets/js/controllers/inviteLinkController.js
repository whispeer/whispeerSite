/**
* inviteController
**/

var socketService = require("services/socket.service").default;
var errorService = require("services/error.service").errorServiceInstance;

define(["bluebird", "asset/state", "controllers/controllerModule"], function (Bluebird, State, controllerModule) {
	"use strict";

	function inviteController($scope) {
		var inviteGenerateState = new State.default();
		$scope.inviteGenerateState = inviteGenerateState.data;

		$scope.generateInvite = function () {
			inviteGenerateState.pending();

			var generateInvitePromise = socketService.emit("invites.generateCode", { active: true }).then(function(result) {
				$scope.inviteCode = result.inviteCode;
			});

			return errorService.failOnErrorPromise(inviteGenerateState, generateInvitePromise);
		};

		$scope.generateInvite();
	}

	inviteController.$inject = ["$scope"];

	controllerModule.controller("ssn.inviteLinkController", inviteController);
});
