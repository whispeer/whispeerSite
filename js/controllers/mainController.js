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
						"image":	"img/profiles/2.jpg",
						"alttext":	"Test"
					},
					"name":	"Nathalie Schmidt"
				},
				"content":	"Ein schöner Abend mit meinem Bärchen :)",
				"info":	{
					"with"	: "Marc Schneider-Zuckerfuß",
					"awesome"	: "14"
				},
				"comments":	[
					{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					},{
						"user": {
							"id":	"1",
							"name":	"Test",
							"image":"img/profil.jpg"
						},
						"content":	"Hallo Welt!",
						"timestamp":	"21:00"
					}
				]
			},
			{
				"sender":	{
					"image":	{
						"image":	"img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Mike König"
				},
				"content":	"Endlich Urlaub!",
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
						"image":	"img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Fiona Schneider"
				},
				"content":	"Shoppen mit der Besten :*",
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
						"image":	"img/profil.jpg",
						"alttext":	"Test"
					},
					"name":	"Nina Müller"
				},
				"content":	"Mädelsabend! Hab euch alle Lieb <3",
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