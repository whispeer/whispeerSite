/**
* setupController
**/

define(["asset/state"], function (State) {
	"use strict";

	function setupController($scope, cssService) {
		cssService.setClass("setupView");

		var saveSetupState = new State();
		$scope.saveSetupState = saveSetupState.data;

		$scope.backup = function () {
			//create backup key
			//encrypt main key w/ backup key
			//download backup key
		};
	}

	setupController.$inject = ["$scope", "ssn.cssService"];

	return setupController;
});