/**
* inviteController
**/

define(["bluebird", "asset/state", "controllers/controllerModule"], function (Bluebird, State, controllerModule) {
	"use strict";

	function inviteController($scope, socketService, errorService) {
		var inviteGenerateState = new State();
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

	inviteController.$inject = ["$scope", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.inviteLinkController", inviteController);
});
