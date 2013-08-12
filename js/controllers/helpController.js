/**
* friendsController
**/

define([], function () {
	"use strict";

	function helpController($scope, cssService) {
		cssService.setClass("helpView");
		$scope.faq = {
			"general": ["register", "password", "search", "report", "account", ],
			"safety": ["safety"],
			"privacy": ["messages", "post", "privacy"],
			"functionality": ["profile", "filter", "circle", "magicbar"]
		};
	}

	helpController.$inject = ["$scope", "ssn.cssService"];

	return helpController;
});