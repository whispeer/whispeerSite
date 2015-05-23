/**
* inviteController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function inviteController($scope, $location, cssService) {
		cssService.setClass("inviteView");

		$scope.domain = $location.protocol() + "://" + $location.host();
		$scope.url = encodeURIComponent($scope.domain);
		$scope.text = "whispeer is an awesome social network!";
		$scope.hashtags = "privacy,whispeer";
	}

	inviteController.$inject = ["$scope", "$location", "ssn.cssService"];

	controllerModule.controller("ssn.inviteController", inviteController);
});
