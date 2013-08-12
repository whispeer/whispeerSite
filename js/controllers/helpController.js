/**
* friendsController
**/

define([], function () {
	"use strict";

	function helpController($scope, cssService) {
		cssService.setClass("helpView");
		$scope.faq = {
			"general": ["kuerzel"],
			"safety": [],
			"privacy": [],
			"functionality": []
		};
	}

	helpController.$inject = ["$scope", "ssn.cssService"];

	return helpController;
});