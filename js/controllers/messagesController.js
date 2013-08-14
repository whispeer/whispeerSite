/**
* messagesController
**/

define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function messagesController($scope, $routeParams, $location, cssService, messageService) {
		cssService.setClass("messagesView");

		$scope.topicid = 0;

		messageService.loadMoreLatest(function (e) {
			if ($routeParams["topicid"]) {
				$scope.loadActiveTopic($routeParams["topicid"]);
			}

			if (e) {
				debugger;
			}
		});

		//messageService.sendNewTopic([1, 2], "Ein erstes Testthema!?");

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.shortenMessage = function (string) {
			if (!string) {
				return "";
			}

			if(string.length > 100) {
				return string.substr(0, 97) + "...";
			} else {
				return string;
			}
		};

		$scope.unloadTopic = function () {
			$scope.topicLoaded = false;
			$scope.topicid = 0;
			$location.search({});
		};

		$scope.loadActiveTopic = function (id) {
			var theTopic;
			step(function () {
				id = parseInt(id, 10);
				if ($scope.topicid !== id || !$scope.topicLoaded) {
					$scope.topicid = id;
					messageService.getTopic(id, this);
				}
			}, h.sF(function (topic) {
				theTopic = topic;
				$scope.canSend = true;
				$scope.newMessage = false;
				theTopic.loadMoreMessages(this);
			}), function (e) {
				$scope.activeTopic = theTopic;

				$scope.topicLoaded = true;

				$location.search({topicid: id});

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

		$scope.newMessage = false;
		$scope.topics2 = [
			{
				"id": "1", // TopicID goes here
				"type":	"peerChat", // Either peerChat or groupChat
				"partner":	{
					"id": "1", // User ID of conversation partner
					"name": "Willi Welle, Willi Welle, Willi Welle, Willi Welle, Willi Welle, Willi Welle, Willi Welle, Willi Welle, Willi Welle, Willi Welle",
					"image": "img/profil.jpg"
				},
				"latestMessage": {
					"text": "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magn",
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

	messagesController.$inject = ["$scope", "$routeParams", "$location", "ssn.cssService", "ssn.messageService"];

	return messagesController;
});