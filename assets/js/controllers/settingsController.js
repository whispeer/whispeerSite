/**
* friendsController
**/

define([], function () {
	"use strict";

	function settingsController($scope, cssService) {
		cssService.setClass("settingsView");
		$scope.safety = {
			"name": {
				first: {
					encrypt: false,
					visibility: []
				},
				last: {
					encrypt: true,
					visibility: []
				}
			},
			"location": {
				encrypt: true,
				visibility: []
			},
			"birthday": {
				encrypt: true,
				visibility: []
			},
			"relationship": {
				encrypt: true,
				visibility: []
			},
			"education": {
				encrypt: true,
				visibility: []
			},
			"work": {
				encrypt: true,
				visibility: []
			},
			"gender": {
				encrypt: true,
				visibility: []
			},
			"languages": {
				encrypt: true,
				visibility: []
			}
		};
	}

	settingsController.$inject = ["$scope", "ssn.cssService"];

	return settingsController;
});