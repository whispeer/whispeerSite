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
				"action": {
					"target":	"photo",
					"content":	":)"
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Willi Welle",
					"image":	"img/profil.jpg"
				},
				"type": "comment",
				"action": {
					"target":	"photo",
					"content":	":)"
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Willi Welle",
					"image":	"img/profil.jpg"
				},
				"type": "comment",
				"action": {
					"target":	"photo",
					"content":	":)"
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Willi Welle",
					"image":	"img/profil.jpg"
				},
				"type": "comment",
				"action": {
					"target":	"photo",
					"content":	":)"
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Willi Welle",
					"image":	"img/profil.jpg"
				},
				"type": "comment",
				"action": {
					"target":	"photo",
					"content":	":)"
				}
			}
		];
	}

	newsController.$inject = ["$scope"];

	return newsController;
});