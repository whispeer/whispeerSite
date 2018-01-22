"use strict";

import ImageUpload from "../services/imageUpload.service"
import errorService from "../services/error.service"
import messageService from "../messages/messageService"
import userService from "../users/userService"

import ChatLoader, { Chat } from "../messages/chat"
import ChunkLoader, { Chunk } from "../messages/chatChunk"

const State = require("asset/state");
const Bluebird = require("bluebird");
const controllerModule = require("controllers/controllerModule");

const sendToUserTopic = (users: number[]) => {
	if (users.length > 1) {
		return Bluebird.resolve();
	}

	return messageService.getUserChat(users[0]);
}

const sendNewChat = (receiver: number[], text, attachments) => {
	return Bluebird.coroutine(function*() {
		const chatID = yield sendToUserTopic(receiver)

		if (chatID) {
			return ChatLoader.get(chatID)
				.then((chat) => {
					chat.sendMessage(text, attachments)
					return null
				}).thenReturn(chatID)
		}

		receiver.sort()

		const chunkData = yield Chunk.createRawData(receiver, { content: {} })
		const receiverObjects = yield userService.getMultiple(receiver)

		const chunk = new Chunk({
			content: {},
			server: {
				id: -1,
				chatID: -1,
				createTime: Date.now()
			},
			meta: chunkData.chunk.meta,
			receiverObjects: receiverObjects.map((u) => u.data)
		}, chunkData)
		const chat = new Chat({ id: -1, latestMessage: null, latestChunk: chunk, unreadMessageIDs: [] }, true)

		ChunkLoader.addLoaded(-1, chunk)
		ChatLoader.addLoaded(-1, chat)

		yield chat.sendMessage(text, attachments)

		return chat.getID()
	})()
}

const messagesController: any = function($scope, $state, $stateParams) {
	$scope.canSend = false;
	$scope.topicLoaded = false;

	var sendMessageState = new State.default();
	$scope.sendMessageState = sendMessageState.data;

	$scope.create = {
		text: "",
		setUsers: function (users) {
			$scope.create.users = users;
		},
		users: [],
		images: [],
		removeImage: function (index) {
			$scope.create.images.splice(index, 1);
		},
		addImages: ImageUpload.fileCallback((files) => {
			$scope.$applyAsync(() => {
				$scope.create.images = $scope.create.images.concat(files.map((file) => new ImageUpload(file)))
			})
		}),
		send: function (receiver, text, images) {
			images = images || [];

			sendMessageState.pending();

			if (text === "" && images.length === 0) {
				sendMessageState.failed();
				return;
			}

			var newTopicPromise = sendNewChat(receiver, text, { images, files: [], voicemails: [] }).then(function (id) {
				$scope.create.text = "";
				$scope.create.selectedElements = [];
				$scope.goToShow(id);
				$scope.$broadcast("resetSearch");
			});

			errorService.failOnErrorPromise(sendMessageState, newTopicPromise);
		}
	};

	function getUser(userid) {
		return userService.get(userid).then(function (user) {
			return user.loadBasicData().then(function () {
				return [user.data];
			});
		});
	}

	function loadInitialUser() {
		if (!$stateParams.userid) {
			return Bluebird.resolve([]);
		}

		return messageService.getUserChat($stateParams.userid).then(function (chatID) {
			if (chatID) {
				$scope.goToShow(chatID);
				return [];
			} else {
				return getUser($stateParams.userid);
			}
		});
	}

	$scope.goToShow = function (topicid) {
		$state.go("app.messages.show", {
			topicid: topicid
		});
	};

	var loadInitialUserPromise = loadInitialUser();

	$scope.getInitialUser = function () {
		return loadInitialUserPromise;
	};

}

messagesController.$inject = ["$scope", "$state", "$stateParams"];

controllerModule.controller("ssn.messagesCreateController", messagesController);
