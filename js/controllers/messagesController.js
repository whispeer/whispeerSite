/**
* messagesController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function messagesController($scope, cssService, messageService) {
		cssService.setClass("messagesView");
		$scope.shortenName = function (name) {
			return name;
			if(name.length > 15) {
				return name.substr(0, 15) + "..";
			} else {
				return name;
			}
		};

		messageService.loadMoreLatest(function (e) {
			if (e) {
				debugger;
			}
		});

		//messageService.sendNewTopic([1, 2], "Ein erstes Testthema!?");
		//messageService.sendMessage(

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.shortenMessage = function (string) {
			if(string.length > 27) {
				return string.substr(0, 27) + "...";
			} else {
				return string;
			}
		};

		$scope.loadActiveTopic = function (id) {
			var theTopic;
			step(function () {
				messageService.getTopic(id, this);
			}, h.sF(function (topic) {
				theTopic = topic;
				$scope.canSend = true;
				theTopic.loadMoreMessages(this);
			}), function (e) {
				$scope.activeTopic = theTopic;

				$scope.topicLoaded = true;

				console.log(e);
			});
		};

		$scope.sendMessage = function () {
			step(function () {
				$scope.canSend = false;
				messageService.sendMessage($scope.activeTopic.id, $scope.activeTopic.newMessage, this);
			}, function () {
				$scope.canSend = true;
				$scope.activeTopic.newMessage = "";
			});
		};

		$scope.topics = messageService.data.latestTopics.data;

		$scope.topics2 = [
			{
				"id": "1", // TopicID goes here
				"type":	"peerChat", // Either peerChat or groupChat
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

	messagesController.$inject = ["$scope", "ssn.cssService", "ssn.messageService"];

	return messagesController;
});