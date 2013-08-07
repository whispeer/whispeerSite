/**
* mainController
**/

define([], function () {
	"use strict";

	function mainController($scope)  {
		$scope.defaultConfig = [
			// Each widget in the magicbar that is displayed to the user per default, is specified as an object here
			{
				"template":	"testWidget",
				"height":	"200px"
			}
		];
		$scope.showDefault = "false";
		$scope.bigTemplate = {};
		$scope.loadWidget = function(name) {
			// first of all, set showDefault to false
			showDefault = "false";
			bigTemplate = {
				"template":	name
			};
		}
		$scope.loadDefault = function() {
			showDefault = "true";
			bigTemplate = {};
		}
	}

	mainController.$inject = ["$scope"];

	return mainController;
});