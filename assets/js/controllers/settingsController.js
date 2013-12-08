/**
* friendsController
**/

define([], function () {
	"use strict";

	function settingsController($scope, cssService) {
		cssService.setClass("settingsView");

		$scope.safetySorted = ["location", "birthday", "relationship", "education", "work", "gender", "languages"];

		$scope.safety = {
			"name": {
				first: {
					encrypt: false,
					visibility: []
				},
				last: {
					encrypt: false,
					visibility: []
				}
			},
			"location": {
				encrypt: true,
				visibility: ["always:allfriends"]
			},
			"birthday": {
				encrypt: true,
				visibility: ["always:allfriends"]
			},
			"relationship": {
				encrypt: true,
				visibility: ["always:allfriends"]
			},
			"education": {
				encrypt: true,
				visibility: ["always:allfriends"]
			},
			"work": {
				encrypt: true,
				visibility: ["always:allfriends"]
			},
			"gender": {
				encrypt: true,
				visibility: ["always:allfriends"]
			},
			"languages": {
				encrypt: true,
				visibility: ["always:allfriends"]
			}
		};
	}

	settingsController.$inject = ["$scope", "ssn.cssService"];

	return settingsController;
});