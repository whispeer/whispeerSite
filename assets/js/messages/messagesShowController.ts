"use strict";

import jQuery from "jquery"
import * as Bluebird from "bluebird"

import Burst from "./burst"
import ChatLoader from "./chat"
import MessageLoader from "./message"

import ImageUploadService from "../services/imageUpload.service"
import h from "../helper/helper";

const errorService = require("services/error.service").errorServiceInstance;
const messageService = require("messages/messageService").default;
const State = require("asset/state");

const initService = require("services/initService");

const messagesModule = require("messages/messagesModule");

namespace BurstHelper {
	export const getNewElements = (messagesAndUpdates, bursts) => {
		return messagesAndUpdates.filter((message) => {
			return bursts.reduce((prev, current) => {
				return prev && !current.hasItem(message);
			}, true);
		});
	}

	export const calculateBursts = (messages: any[]) => {
		var bursts = [new Burst()];
		var currentBurst = bursts[0];

		messages.sort((m1, m2) => {
			return m2.getTime() - m1.getTime();
		});

		messages.forEach((messageOrUpdate) => {
			if (!currentBurst.fitsItem(messageOrUpdate)) {
				currentBurst = new Burst();
				bursts.push(currentBurst);
			}

			currentBurst.addItem(messageOrUpdate);
		});

		return bursts;
	}

	const hasMatchingMessage = (oldBurst, newBurst) => {
		var matchingMessages = newBurst.getItems().filter((message) => {
			return oldBurst.hasItem(message);
		});

		return matchingMessages.length > 0;
	}

	const addBurst = (bursts, burst) => {
		bursts.push(burst);

		return true;
	}

	const mergeBurst = (oldBurst, newBurst) => {
		var newMessages = newBurst.getItems().filter((message) => {
			return !oldBurst.hasItem(message);
		});

		newMessages.forEach((message) => {
			oldBurst.addItem(message);
		});

		return true;
	}

	const addBurstOrMerge = (bursts, burst) => {
		var possibleMatches = bursts.filter((oldBurst) => {
			return hasMatchingMessage(oldBurst, burst);
		});

		if (possibleMatches.length === 0) {
			return addBurst(bursts, burst);
		}

		if (possibleMatches.length === 1) {
			return mergeBurst(possibleMatches[0], burst);
		}

		if (possibleMatches.length > 1) {
			errorService.criticalError(new Error("Burst merging possible matches > 1 wtf..."));
			return false;
		}
	}

	export const mergeBursts = (bursts, newBursts) => {
		return newBursts.reduce((prev, burst) => {
			return prev && addBurstOrMerge(bursts, burst);
		}, true);
	}
}

function messagesController($scope, $element, $state, $stateParams, $timeout) {
	var topicLoadingState = new State.default();
	$scope.topicLoadingState = topicLoadingState.data;

	var chatID = h.parseDecimal($stateParams.topicid);

	$scope.canSend = false;
	$scope.topicLoaded = false;

	$scope.hideOverlay = false;

	$scope.doHideOverlay = function() {
		$scope.hideOverlay = true;
	};

	$scope.images = {
		images: [],
		removeImage: function(index) {
			$scope.images.images.splice(index, 1);
		},
		addImages: ImageUploadService.fileCallback(function(newImages) {
			$scope.$apply(function() {
				$scope.images.images = $scope.images.images.concat(newImages);
			});
		})
	};

	$scope.markRead = function() {
		$scope.activeChat.markRead(errorService.criticalError);
	};

	$scope.loadMoreMessages = function() {
		$scope.loadingMessages = true;
		return $scope.activeChat.loadMoreMessages().then(function({ remaining }) {
			$scope.remainingMessagesCount = remaining
			$scope.loadingMessages = false;
		});
	};

	$scope.$on("$destroy", function() {
		messageService.setActiveChat(0);
	});

	topicLoadingState.pending();

	function loadMoreUntilFull() {
		if ($scope.remainingMessagesCount === 0) {
			return
		}

		Bluebird.delay(500).then(function() {
			var scroller = $element.find(".scroll-pane");

			var outerHeight = scroller.height();
			var innerHeight = 0;
			scroller.children().each(function() {
				innerHeight = innerHeight + jQuery(this).outerHeight(true);
			});

			if (outerHeight > innerHeight) {
				return $scope.loadMoreMessages().then(function() {
					loadMoreUntilFull();

					return null;
				});
			}
		});
	}

	var loadTopicsPromise = initService.awaitLoading().then(() =>
		ChatLoader.get(chatID)
	).then(function(chat) {
		messageService.setActiveChat(chatID);
		$scope.activeChat = chat;

		$scope.canSend = true;
		$scope.newMessage = false;
		return chat.loadInitialMessages().thenReturn(chat);
	}).then(function(chat) {
		$scope.topicLoaded = true;

		if (chat.getMessagesAndUpdates().length > 0) {
			chat.markRead(errorService.criticalError);
		}

		loadMoreUntilFull();

		return null;
	});

	errorService.failOnErrorPromise(topicLoadingState, loadTopicsPromise);

	var sendMessageState = new State.default();
	$scope.sendMessageState = sendMessageState.data;

	$scope.sendMessage = function() {
		sendMessageState.pending();

		var images = $scope.images.images;
		var text = $scope.activeChat.newMessage;

		if (text === "" && images.length === 0) {
			sendMessageState.failed();
			return;
		}

		$scope.canSend = false;

		var sendMessagePromise = messageService.sendMessage($scope.activeChat.id, text, images).then(function() {
			$scope.activeChat.newMessage = "";
			$scope.images.images = [];
			$scope.markRead(errorService.criticalError);
			$timeout(function() {
				sendMessageState.reset();
			}, 2000);
		});

		sendMessagePromise.finally(function() {
			$scope.canSend = true;
		});

		errorService.failOnErrorPromise(sendMessageState, sendMessagePromise);
	};

	let bursts = [], burstTopic;

	function getBursts() {
		if (!$scope.activeChat || $scope.activeChat.getMessagesAndUpdates().length === 0) {
			return { changed: false, bursts: [] };
		}

		const messagesAndUpdates = $scope.activeChat.getMessagesAndUpdates().map(({ id: { id, type }}) => {
			if (type === "message") {
				return MessageLoader.getLoaded(id)
			}

			if (type === "topicUpdate") {
				throw new Error("not yet implemented")
			}

			throw new Error("invalid type for message or update")
		})

		if (burstTopic !== $scope.activeChat.getID()) {
			bursts = BurstHelper.calculateBursts(messagesAndUpdates);
			burstTopic = $scope.activeChat.getID();

			return { changed: true, bursts: bursts };
		}

		var newElements = BurstHelper.getNewElements(messagesAndUpdates, bursts);

		if (newElements.length === 0) {
			return { changed: false, bursts: bursts };
		}

		bursts.forEach((burst) => {
			burst.removeAllExceptLast();
		});

		var newBursts = BurstHelper.calculateBursts(messagesAndUpdates);
		if (!BurstHelper.mergeBursts(bursts, newBursts)) {
			console.warn("Rerender all bursts!");
			bursts = newBursts;
		}

		return { changed: true, bursts: bursts };
	}

	$scope.messageBursts = function() {
		const { bursts } = getBursts();

		bursts.sort(function(b1, b2) {
			return b1.firstItem().getTime() - b2.firstItem().getTime();
		});

		return bursts;
	};

	$scope.showMessageOptions = false;
	$scope.toggleMessageOptions = function() {
		$scope.showMessageOptions = !$scope.showMessageOptions;
	};
}

(<any>messagesController).$inject = ["$scope", "$element", "$state", "$stateParams", "$timeout"];

messagesModule.controller("ssn.messagesShowController", messagesController);
