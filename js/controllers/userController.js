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
					"month": "08",
					"year":	"2013"
				},
				"location": {
					"town":	"Wellendorf",
					"state": "Wellenbundesland",
					"country": "Wellenland"
				},
				"partner":	{
					"type":	"relationship",
					"name": "Gisela Welle"
				},
				"education":	[{"name": "Wellenschule"}, {"name": "Wellen-Grundschule"}],
				"job":	"Surf-Lehrer",
				"company":	"Surfschool",
				"gender":	"m",
				"languages": [{"name": "Deutsch"}, {"name": "Englisch"}],
			}
		};

		$scope.edit = function () {
			$scope.editGeneral = !$scope.editGeneral;
		};

		$scope.set = function (val) {
			if (typeof val === "undefined" || val === null) {
				return false;
			}

			if (typeof val === "object" && val instanceof Array && val.length !== 0) {
				return true;
			}

			if (typeof val === "string") {
				return val !== "";
			}

			if (typeof val === "object") {
				var attr;
				for (attr in val) {
					if (val.hasOwnProperty(attr)) {
						if (typeof val[attr] !== "undefined" && val[attr] !== "") {
							return true;
						}
					}
				}

				return false;
			}
		};

		$scope.setE = function (val, ret) {
			if ($scope.editGeneral || $scope.set(val)) {
				return ret;
			}

			return "";
		};

		$scope.setEDeep = function (val) {
			var keys = Object.keys(val), i, res = "";
			keys.sort();
			for (i = 0; i < keys.length; i += 1) {
				res = res + $scope.setE(val[keys[i]], keys[i]);
			}

			return res;
		};

		$scope.removeElement = function(array, index) {
			array.splice(index, 1);
		};

		$scope.addElement = function(array, element, maxLength) {
			if (!maxLength || array.length <= maxLength) {
				array.push(element);
			}
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