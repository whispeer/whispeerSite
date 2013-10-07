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
					"name":	"Julia Krämer",
					"image":	"/assets/img/user.png"
				},
				"type": "awesome",
				"origin": "", // Username of the owner of e.g a shared image
				"action": {
					"target":	"post",
					"you":	"own",
					"content":	""
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Anna Berger",
					"image":	"/assets/img/user.png"
				},
				"type": "share",
				"origin": "Ben Brand", // Username of the owner of e.g a shared image
				"action": {
					"target":	"photo",
					"you":	"awesomed",
					"content":	""
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Nadine Gutzberg",
					"image":	"/assets/img/user.png"
				},
				"type": "posted",
				"origin": "Ben Brand", // Username of the owner of e.g a shared image
				"action": {
					"target":	"wallpost",
					"you":	"own",
					"content":	"<3"
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Anna Berger",
					"image":	"/assets/img/user.png"
				},
				"type": "comment",
				"origin": "Kevin Klein", // Username of the owner of e.g a shared image
				"action": {
					"target":	"post",
					"you":	"commented",
					"content":	"hihi :D"
				}
			},
			{
				"user": {
					"id":	"1",
					"name":	"Kevin Klein",
					"image":	"/assets/img/user.png"
				},
				"type": "comment",
				"origin": "Kevin Klein", // Username of the owner of e.g a shared image
				"action": {
					"target":	"post",
					"you":	"commented",
					"content":	"hihi :D"
				}
			}
		];
	}

	newsController.$inject = ["$scope"];

	return newsController;
});