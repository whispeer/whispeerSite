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
				"type":	"peerChat", // Either peerChat or groupChat
				"unread": true,
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Willi Welle",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Lorem Ipsum Dolor Sit Amet <pgnpgndaipbnqeog",
					"timestamp": "21:00"
				},
				"messages": [{
					// each object is a message!
					"id": "1",
					"sender": {
						"id": "2", // User ID of Sender
						"image": "img/profil.jpg",
						"name": "Willi Welle",
						"me":	true,
						"other": false
					},
					"content": "Lorem Ipsum dolor sit amet",
					"type":	"image",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},
			{
				"id": "1", // TopicID goes here
				"type":	"peerChat", // Either peerChat or groupChat
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Luisa Katharina Marschner",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Lorem Ipsum Dolor Sit Amet",
					"timestamp": "21:00"
				},
				"messages": [{
					// each object is a message!
					"id": "1",
					"sender": {
						"id": "2", // User ID of Sender
						"image": "img/profil.jpg",
						"name": "Willi Welle",
						"me":	true,
						"other": false
					},
					"content": "Lorem Ipsum dolor sit amet",
					"type":	"image",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},{
				"id": "1", // TopicID goes here
				"type":	"peerChat", // Either peerChat or groupChat
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Willi Welle",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Lorem Ipsum Dolor Sit Amet",
					"timestamp": "21:00"
				},
				"messages": [{
					// each object is a message!
					"id": "1",
					"sender": {
						"id": "2", // User ID of Sender
						"image": "img/profil.jpg",
						"name": "Willi Welle",
						"me":	true,
						"other": false
					},
					"content": "Lorem Ipsum dolor sit amet",
					"type":	"image",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},{
				"id": "1", // TopicID goes here
				"type":	"peerChat", // Either peerChat or groupChat
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Willi Welle",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Lorem Ipsum Dolor Sit Amet",
					"timestamp": "21:00"
				},
				"messages": [{
					// each object is a message!
					"id": "1",
					"sender": {
						"id": "2", // User ID of Sender
						"image": "img/profil.jpg",
						"name": "Willi Welle",
						"me":	true,
						"other": false
					},
					"content": "Lorem Ipsum dolor sit amet",
					"type":	"image",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			}
		];
		$scope.activeTopic = {
			"id": "1", // TopicID goes here
			"type": "peerChat", // Either peerChat or groupChat
			"partner":	{
				"id": "1", // User ID of conversation partner
				"name": "Willi Welle",
				"image": "img/profil.jpg"
			},
			"latestMessage":	"Lorem Ipsum Dolor Sit Amet",
			"messages": [{
				// each object is a message!
				"id": "1",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "Willi Welle",
					"me":	true,
					"other": false
				},
				"content": "img/test.jpg",
				"type":	"image",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "1",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "Willi Welle",
					"me":	false,
					"other": true
				},
				"content": "Lorem Ipsum dolor sit amet",
				"type":	"text",
				"timestamp": ""
			}]
		};
	}

	messagesController.$inject = ["$scope"];

	return messagesController;
});