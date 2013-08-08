/**
* mainController
**/

define([], function () {
	"use strict";

	function mainController($scope, magicService)  {
		$scope.defaultConfig = [
			// Each widget in the magicbar that is displayed to the user per default, is specified as an object here
			{
				"template":	"testWidget",
				"height":	"200px"
			}
		];
		
		
		$scope.loadWidget = function(name) {
			// first of all, set showDefault to false
			magicService.showDefault = false;
			magicService.template = name;
		}
		$scope.loadDefault = function() {
			magicService.showDefault = true;
		}
		
		$scope.config = magicService;
	}

	mainController.$inject = ["$scope", "ssn.magicbarService"];

	return mainController;
});