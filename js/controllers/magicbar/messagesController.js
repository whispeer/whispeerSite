/**
* messagesController
**/

define([], function () {
	"use strict";

	function messagesController($scope)  {
		$scope.shortenName = function (name) {
			if(name.length > 17) {
				return name.substr(0, 17) + "..";
			} else {
				return name;
			}
		};
		$scope.shortenMessage = function (string) {
			if(string.length > 27) {
				return string.substr(0, 27) + "...";
			} else {
				return string;
			}
		};
		$scope.unreadClass = function(element) {
			if(element.unread) {
				return "unread";
			}
			return "";
		}
		$scope.topics = [
			{
				"id": "1", // TopicID goes here
				"unread": true,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Julia Krämer",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Montag schwimmen gehen?",
					"timestamp": "21:00"
				}
			},
			{
				"id": "2", // TopicID goes here
				"unread": true,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Anton Müller",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Na, was geht bei dir so?",
					"timestamp": "21:00"
				}
			},
			{
				"id": "3", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Arno Nymus",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Bist du bei der nächsten Anti-Prism-Demo auch wieder am Start?",
					"timestamp": "21:00"
				}
			},
			{
				"id": "4", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Kevin Klein",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Ok, bis später dann!",
					"timestamp": "21:00"
				}
			},
			{
				"id": "5", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Anna Berger",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Hab dich auch lieb!",
					"timestamp": "21:00"
				}
			},
			{
				"id": "7", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Thomas Müller",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Oh mein Gott! Ich kann die Welt beeinflussen :D",
					"timestamp": "21:00"
				}
			},
			{
				"id": "6", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Agathe Bauer",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Es tut mir leid!",
					"timestamp": "21:00"
				}
			},
			{
				"id": "8", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Corinna Göhre",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Oh mein Gott! Ich kann die Welt beeinflussen :D",
					"timestamp": "21:00"
				}
			},
			{
				"id": "9", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "The Doctor",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "I know, I know... It's bigger on the inside...",
					"timestamp": "21:00"
				}
			},
			{
				"id": "10", // TopicID goes here
				"unread": false,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Nadine Gutzberg",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Who're you going to call?",
					"timestamp": "21:00"
				}
			}
		];
	}

	messagesController.$inject = ["$scope"];

	return messagesController;
});