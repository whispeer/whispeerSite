/**
* mainController
**/

define([], function () {
	"use strict";

	function mainController($scope, magicService, messageService, friendsService)  {
		$scope.defaultConfig = [
			// Each widget in the magicbar that is displayed to the user per default, is specified as an object here
			{
				"template":	"messages",
				"controllerName":	"messagesController"
			},
			{
				"template":	"friends",
				"controllerName":	"messagesController"
			}
		];

		$scope.messages = messageService.data;
		$scope.friends = friendsService.data;
		$scope.news = {
			"count":	0
		};
		
		$scope.widgetHeight = 100 / $scope.defaultConfig.length - 5;
		
		$scope.loadWidget = function(name) {
			// first of all, set showDefault to false
			magicService.showDefault = false;
			magicService.template = name;
		};

		$scope.loadDefault = function() {
			magicService.showDefault = true;
		};

		$scope.config = magicService;
	}

	mainController.$inject = ["$scope", "ssn.magicbarService", "ssn.messageService", "ssn.friendsService"];

	return mainController;
});