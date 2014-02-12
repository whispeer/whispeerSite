/**
* mainController
**/

define([], function () {
	"use strict";

	function mainController($scope, cssService, postService) {
		cssService.setClass("mainView");

		$scope.$on("selectionChange", function (event, newSelection) {
			$scope.newPost.readers = newSelection.map(function (e) {
				return e.id;
			});
		});

		$scope.postActive = false;
		$scope.filterActive = false;
		$scope.newPost = {
			text: "",
			readers: []
		};

		$scope.sendPost = function() {
			$scope.postActive = !$scope.postActive;
		};
		$scope.sendPost = function () {
			postService.getTimelinePosts(0, ["always:allfriends"], function () {
				debugger;
			});

			/*postService.createPost($scope.newPost.text, $scope.newPost.readers, 0, function (err, post) {
				post.getText(function (err, text) {
					debugger;
				});
			});*/

			$scope.postActive = false;
		};
		$scope.toggleFilter = function() {
			$scope.filterActive = !$scope.filterActive;
		};
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
							"image":"/assets/img/user.png",
							"me": true
						},
						"content":	"Hallo Welt! Lorem ipsum dolor sit amet, amet dolor felses dramatikum dolosgnweio+gbeqi0h#nfonho#GBÜnrg#psnRWNW#RPHFNB  hwr bäwrihns#pkb tnsfhpiwrntgfsnhwropngpn topngopn tpoqenhprwntpadnh'W PRt",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png",
							"me": false
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png",
							"me": true
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"/assets/img/user.png",
							"me": false
						},
						"content":	"Hallo Welt!",
						"timestamp":	"06:56",
						"date":	"15.08.13"
					}				]
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

	mainController.$inject = ["$scope", "ssn.cssService", "ssn.postService"];

	return mainController;
});