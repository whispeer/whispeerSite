/**
* newsController
**/

define([], function () {
	"use strict";

	function newsController($scope)  {
		$scope.news = [
			{
				"user": {
					"id":	"1",
					"name":	"Willi Welle",
					"image":	"img/profil.jpg"
				},
				"type": "comment",
				"origin": "Gretel", // Username of the owner of e.g a shared image
				"action": {
					"target":	"photo",
					"you":	"awesomed",
					"content":	":)"
				}
			}
		];
	}

	newsController.$inject = ["$scope"];

	return newsController;
});