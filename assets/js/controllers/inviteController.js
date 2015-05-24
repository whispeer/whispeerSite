/**
* inviteController
**/

define(["step", "whispeerHelper", "asset/state", "controllers/controllerModule"], function (step, h, State, controllerModule) {
	"use strict";

	function inviteController($scope, $location, cssService, localize) {
		cssService.setClass("inviteView");

		$scope.domain = $location.protocol() + "://" + $location.host();
		$scope.url = encodeURIComponent($scope.domain);
		$scope.text = localize.getLocalizedString("views.invite.shareText", {});
		$scope.hashtags = localize.getLocalizedString("views.invite.shareHashTags", {});
	}

	inviteController.$inject = ["$scope", "$location", "ssn.cssService", "localize"];

	controllerModule.controller("ssn.inviteController", inviteController);
});
