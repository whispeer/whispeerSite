/**
* messagesController
**/

define(['step'], function (step) {
	'use strict';

	function messagesController($scope) {
		$scope.$parent.cssClass = "messagesView";
		$scope.topics = [
			{
				"id": "1", // TopicID goes here
				"type":	"peerChat", // Either peerChat or groupChat
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			}
		];
		$scope.activeTopic = {
			"id": "1", // TopicID goes here
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
					"name": "Willi Welle"
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			}]
		};
	}

	messagesController.$inject = ['$scope'];

	return messagesController;
});