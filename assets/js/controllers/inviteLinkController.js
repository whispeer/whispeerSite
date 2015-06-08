/**
* inviteController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function inviteController($scope, socketService, errorService) {
		var inviteGenerateState = new State();
		$scope.inviteGenerateState = inviteGenerateState.data;

		$scope.generateInvite = function () {
			inviteGenerateState.pending();

			step(function () {
				socketService.emit("invites.generateCode", { active: true }, this);
			}, h.sF(function (result) {
				$scope.inviteCode = result.inviteCode;

				this.ne();
			}), errorService.failOnError(inviteGenerateState));
		};

		$scope.generateInvite();
	}

	inviteController.$inject = ["$scope", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.inviteLinkController", inviteController);
});
