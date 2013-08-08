/**
* requestsController
**/

define([], function () {
	"use strict";

	function requestsController($scope)  {
		$scope.shortenName = function (name) {
			if(name.length > 17) {
				return name.substr(0, 17) + "..";
			} else {
				return name;
			}
		};
		$scope.requests = [
			{
				"id":	"1",
				"user": {
					"id": "1",
					"name": "Julian Frech",
					"mutuals":	"23",
					"image":	"img/profil.jpg"
				}
			},
			{
				"id":	"2",
				"user": {
					"id": "2",
					"name": "Sarah Gruhn",
					"mutuals":	"45",
					"image":	"img/profil.jpg"
				}
			},
			{
				"id":	"3",
				"user": {
					"id": "3",
					"name": "Oliver Westhoff",
					"mutuals":	"45",
					"image":	"img/profil.jpg"
				}
			},{
				"id":	"4",
				"user": {
					"id": "4",
					"name": "Kimberly Papke",
					"mutuals":	"45",
					"image":	"img/profil.jpg"
				}
			},{
				"id":	"5",
				"user": {
					"id": "5",
					"name": "Melanie",
					"mutuals":	"45",
					"image":	"img/profil.jpg"
				}
			},
		];
	}

	requestsController.$inject = ["$scope"];

	return requestsController;
});