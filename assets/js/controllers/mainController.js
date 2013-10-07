/**
* mainController
**/

define([], function () {
	"use strict";

	function mainController($scope, cssService) {
		cssService.setClass("mainView");
		$scope.posts = [
			{
				"sender":	{
					"image":	{
						"image":	"/assets/img/user.png",
						"alttext":	"Test"
					},
					"name":	"Nathalie Schmidt"
				},
				"content":	{
					"text": "whispeer ist so awesome! :)",
					"image":	"/assets/img/logo.png"
				},
				"info":	{
					"with"	: "Marc Schneider-Zuckerfuß",
					"awesome"	: "14"
				},
				"comments":	[
					{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt! Lorem ipsum dolor sit amet, amet dolor felses dramatikum dolosgnweio+gbeqi0h#nfonho#GBÜnrg#psnRWNW#RPHFNB  hwr bäwrihns#pkb tnsfhpiwrntgfsnhwropngpn topngopn tpoqenhprwntpadnh'W PRt",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content": "Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					}
				]
			},
			{
				"sender":	{
					"image":	{
						"image":	"/assets/img/user.png",
						"alttext":	"Test"
					},
					"name":	"Mike König"
				},
				"content":	{"text": "Endlich Urlaub!"},
				"info":	{
					"with"	: "",
					"awesome"	: "50",
					"comments":	{
						"count":	"23"
					}
				}
			},
			{
				"sender":	{
					"image":	{
						"image":	"/assets/img/user.png",
						"alttext":	"Test"
					},
					"name":	"Fiona Schneider"
				},
				"content":{"text":	"Shoppen mit der Besten :*"},
				"info":	{
					"with"	: "Jennifer Graf",
					"awesome"	: "0",
					"comments":	{
						"count":	"261"
					}
				}
			},
			{
				"sender":	{
					"image":	{
						"image":	"/assets/img/user.png",
						"alttext":	"Test"
					},
					"name":	"Nina Müller"
				},
				"content":{"text":	"Mädelsabend! Hab euch alle Lieb <3"},
				"info":	{
					"with"	: "Fiona Hasenbrink, Mia von Schimmelhof, Alexandra Lehmann",
					"awesome"	: "27",
					"comments":	{
						"count":	"3"
					}
				}
			}
		];
	}

	mainController.$inject = ["$scope", "ssn.cssService"];

	return mainController;
});