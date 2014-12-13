/**
* friendsController
**/

define([], function () {
	"use strict";

	function helpController($scope, cssService) {
		cssService.setClass("helpView", true);
		$scope.faq = {
			"general": ["register", "password", "search", "report", "account", ],
			"safety": ["safety"],
			"privacy": ["messages", "post", "privacy"],
			"functionality": ["profile", "filter", "circle"]
		};
	}

	helpController.$inject = ["$scope", "ssn.cssService"];

	return helpController;
});