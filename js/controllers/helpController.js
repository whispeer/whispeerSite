/**
* friendsController
**/

define(['step'], function (step) {
	'use strict';

	function helpController($scope) {
		$scope.$parent.cssClass = "helpView";
		$scope.faq = {
			"general": [
				{
					"question": "Test?",
					"answer":	"Test!"
				},
				{
					"question": "Test?",
					"answer":	"Test!"
				},{
					"question": "Test?",
					"answer":	"Test!"
				}
			],
			"safety": [],
			"privacy": [],
			"functionality": []
		};
	}

	helpController.$inject = ['$scope'];

	return helpController;
});