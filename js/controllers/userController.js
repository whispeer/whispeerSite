/**
* userController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function userController($scope, $routeParams, cssService, userService) {
		var identifier = $routeParams.identifier;
		$scope.loading = true;

		cssService.setClass("profileView");

		$scope.user	= {
			"name":	"Not loaded",
			"data": {
				"image": "img/profil.jpg",
				"me": true,
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
			}
		};

		$scope.removeElement = function(index) {
				
		};

		$scope.possibleStatus = ["single", "relationship", "engaged", "married", "divorced", "widowed", "complicated", "open", "inlove"];

		$scope.editGeneral = false;

		step(function () {
			userService.get(identifier, this);
		}, h.sF(function (user) {
			this.parallel.unflatten();
			user.getName(this.parallel());
			user.getImage(this.parallel());
		}), h.sF(function (name, image) {
			$scope.user.name = name;
			$scope.user.image = image;
			$scope.loading = false;
		}));

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