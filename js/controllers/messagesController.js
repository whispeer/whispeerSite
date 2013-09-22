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
				console.log(e);
			}
		});

		$scope.canSend = false;
		$scope.topicLoaded = false;

		$scope.new = {
			text: "",
			receiver: "",
			send: function (receiver, text) {
				var receiverIDs = receiver.split(",").map(function (e) {
					return parseInt(e, 10);
				});

				messageService.sendNewTopic(receiverIDs, text, function (e, id) {
					$scope.new.text = "";
					$scope.new.receiver = "";
					$scope.loadActiveTopic(id);
				});
			}
		};

		$scope.scrollLock = false;

		$scope.markRead = function (messageid) {
			$scope.activeTopic.obj.markRead(messageid, function (e) {
				if (e) {
					console.log(e);
				}
			});
		};

		$scope.loadMoreMessages = function () {
			$scope.scrollLock = true;
			$scope.loadingMessages = true;
			$scope.activeTopic.obj.loadMoreMessages(function () {
				$scope.loadingMessages = false;
				$scope.scrollLock = false;
			});
		};

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
				theTopic.loadInitialMessages(this);
			}), h.sF(function () {
				$scope.activeTopic = theTopic.data;

				$scope.topicLoaded = true;

				$location.search({topicid: id});
			}));
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
					"image": "/img/profil.jpg"
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
						"image": "/img/profil.jpg",
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
					"image": "/img/profil.jpg"
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
						"image": "/img/profil.jpg",
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
					"image": "/img/profil.jpg"
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
						"image": "/img/profil.jpg",
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
					"image": "/img/profil.jpg"
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
						"image": "/img/profil.jpg",
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
				"image": "/img/profil.jpg"
			},
			"latestMessage":	"Lorem Ipsum Dolor Sit Amet",
			"messages": [{
				// each object is a message!
				"id": "1",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "/img/profil.jpg",
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
					"image": "/img/profil.jpg",
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