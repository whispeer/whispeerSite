/**
* setupController
**/

define([], function () {
	"use strict";

	function setupController($scope, cssService) {
		cssService.setClass("setupView");

		$scope.backup = function () {
			//create backup key
			//encrypt main key w/ backup key
			//download backup key
		};
	}

	setupController.$inject = ["$scope", "ssn.cssService"];

	return setupController;
});