/**
* inviteController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function inviteController($scope, $location, cssService, keyStore, socketService, errorService) {
		cssService.setClass("inviteView");

		var inviteGenerateState = new State();
		$scope.inviteGenerateState = inviteGenerateState.data;

		$scope.domain = $location.protocol() + "://" + $location.host();
		$scope.url = encodeURIComponent($scope.domain);
		$scope.text = "whispeer is an awesome social network!";
		$scope.hashtags = "privacy,whispeer";

		$scope.empty = function (val) {
			return val === "" || !h.isset(val);
		};

		$scope.generateInvite = function () {
			inviteGenerateState.pending();

			step(function () {
				socketService.emit("invites.generateCode", {}, this);
			}, h.sF(function (result) {
				$scope.inviteCode = result.inviteCode;

				this.ne();
			}), errorService.failOnError(inviteGenerateState));
		};
	}

	inviteController.$inject = ["$scope", "$location", "ssn.cssService", "ssn.keyStoreService", "ssn.socketService", "ssn.errorService"];

	controllerModule.controller("ssn.inviteController", inviteController);
});
