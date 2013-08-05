/**
* userController
**/

define([], function () {
	"use strict";

	function userController($scope, cssService) {
		cssService.setClass("profileView");
		$scope.user	= {
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
	}

	userController.$inject = ["$scope", "ssn.cssService"];

	return userController;
});