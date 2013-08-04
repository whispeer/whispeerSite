/**
* friendsController
**/

define(['step'], function (step) {
	'use strict';

	function friendsController($scope) {
		$scope.$parent.cssClass = "friendsView";
		$scope.friends = [
			{
				"name": "Willi Welle",
				"mutualFriends":	"295",
				"image":	"img/profil.jpg"
				//"lists":	[''] // ID's of the Lists with this friend
			},
			{
				"name": "William Welle",
				"mutualFriends":	"495",
				"image":	"img/profil.jpg"
				//"lists":	[''] // ID's of the Lists with this friend
			}
		];
	}

	friendsController.$inject = ['$scope'];

	return friendsController;
});