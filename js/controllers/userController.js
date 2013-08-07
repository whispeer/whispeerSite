/**
* userController
**/

define(["step", "helper"], function (step, h) {
	"use strict";

	function userController($scope, $routeParams, cssService, userService) {
		var identifier = $routeParams.identifier;
		$scope.loading = true;

		cssService.setClass("profileView");

		$scope.user = {
			data: {
				"me":	true
			}
		};

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			user.getName(this);
		}), h.sF(function (name) {
			$scope.user.name = name;
			$scope.loading = false;
		}));

		/*$scope.user	= {
			"name":	"Willi Welle",
			"data": {
				"birthday":	"09.08.13",
				"town":	"Enger",
				"state":	"NRW",
				"country":	"Germany",
				"partner":	"Gisela Welle",
				"education":	["Wellenschule", "Wellen-Grundschule"],
				"job":	"Surf-Lehrer",
				"company":	"Surfschool",
				"gender":	"f",
				"languages": ["Deutsch","Englisch"]
			}
		};*/
		$scope.posts = [
			{
				"sender":	{
					"image":	{
						"image":	"img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Daniel Melchior"
				},
				"content":	"Lorem Ipsum Dolor Sit Amet!",
				"info":	{
					"with"	: "Svenja Kenneweg",
					"awesome"	: "20",
					"comments":	{
						"count":	"20"
					}
				}
			},
			{
				"sender":	{
					"image":	{
						"image":	"img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Daniel Melchior"
				},
				"content":	"Lorem Ipsum Dolor Sit Amet!",
				"info":	{
					"with"	: "Svenja Kenneweg",
					"awesome"	: "20",
					"comments":	{
						"count":	"20"
					}
				}
			},
			{
				"sender":	{
					"image":	{
						"image":	"img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Daniel Melchior"
				},
				"content":	"Lorem Ipsum Dolor Sit Amet!",
				"info":	{
					"with"	: "Svenja Kenneweg",
					"awesome"	: "20",
					"comments":	{
						"count":	"20"
					}
				}
			}
		];
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

	userController.$inject = ["$scope", "$routeParams", "ssn.cssService", "ssn.userService"];

	return userController;
});