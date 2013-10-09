/**
* friendsController
**/

define([], function () {
	"use strict";

	function friendsController($scope, cssService)  {
		cssService.setClass("friendsView");
		$scope.friends = [
			{
				"name": "Willi Welle",
				"mutualFriends":	"295",
				"image":	"/assets/img/user.png"
				//"lists":	[""] // ID's of the Lists with this friend
			}
		];
	}

	friendsController.$inject = ["$scope", "ssn.cssService"];

	return friendsController;
});