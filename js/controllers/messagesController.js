/**
* messagesController
**/

define([], function () {
	"use strict";

	function messagesController($scope, cssService) {
		cssService.setClass("messagesView");
		$scope.topics = [
			{
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},{
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},
			{
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},
			{
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},
			{
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},
			{
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
					"timestamp": ""
				}] // All Messages of conversation (or the x latest - whatever)
			},
			{
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
						"name": "Willi Welle"
					},
					"text": "Lorem Ipsum dolor sit amet",
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
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "2",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "William Welle",
					"me":	false,
					"other": true
				},
				"text": "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "3",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "Willi Welle",
					"me":	true,
					"other": false
				},
				"text": "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "4",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "William Welle",
					"me":	false,
					"other": true
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "5",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "Willi Welle",
					"me":	true,
					"other": false
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "6",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "William Welle",
					"me":	false,
					"other": true
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "7",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "Willi Welle",
					"me":	true,
					"other": false
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "8",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "William Welle",
					"me":	false,
					"other": true
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "9",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "Willi Welle",
					"me":	true,
					"other": false
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "10",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "William Welle",
					"me":	false,
					"other": true
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "11",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "Willi Welle",
					"me":	true,
					"other": false
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			},{
				// each object is a message!
				"id": "12",
				"sender": {
					"id": "2", // User ID of Sender
					"image": "img/profil.jpg",
					"name": "William Welle",
					"me":	false,
					"other": true
				},
				"text": "Lorem Ipsum dolor sit amet",
				"timestamp": ""
			}]
		};
	}

	messagesController.$inject = ["$scope", "ssn.cssService"];

	return messagesController;
});