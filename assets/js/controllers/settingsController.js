/**
* friendsController
**/

define(["whispeerHelper"], function (h) {
	"use strict";

	function settingsController($scope, cssService, settingsService) {
		cssService.setClass("settingsView");

		$scope.safetySorted = ["location", "birthday", "relationship", "education", "work", "gender", "languages"];

		step(function () {
			settingsService.getBranch("privacy", this);
		}, h.sF(function (branch) {
			$scope.safety = branch;
		}), function (e) {
			debugger;
		});


		/*
		$scope.safety = {
			"basic": {
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
		*/
	}

	settingsController.$inject = ["$scope", "ssn.cssService", "ssn.settingsService"];

	return settingsController;
});