/**
* userController
**/

define(["step", "whispeerHelper"], function (step, h) {
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
		$scope.editGeneral = false;
		$scope.removeElement = function(index) {
				
		};
		$scope.possibleStatus = ["single", "relationship", "engaged", "married", "divorced", "widowed", "complicated", "open", "inlove"];
		$scope.user	= {
			"name":	"Willi Welle",
			"data": {
				"birthday":	{
					"day":	"09",
					"month":	"08",
					"year":	"2013"
				},
				"town":	"",
				"state":	"NRW",
				"country":	"Germany",
				"partner":	{
					"type":	"relationship",
					"name": "Gisela Welle"
				},
				"education":	[{"name": "Wellenschule"}, {"name": "Wellen-Grundschule"}],
				"job":	"Surf-Lehrer",
				"company":	"Surfschool",
				"gender":	"m",
				"languages": [{"name": "Deutsch"},{"name": "Englisch"}],
				"me":	true
			}
		};
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