"use strict";

import jQuery from "jquery"
import * as Bluebird from "bluebird"

import Burst from "./burst"
import ChatLoader, { Chat } from "./chat"
import MessageLoader from "./message"

import ImageUpload from "../services/imageUpload.service"
import FileUpload from "../services/fileUpload.service"
import h from "../helper/helper";
import Progress from "../asset/Progress"

import blobService from "../services/blobService"

import FeatureToggles from "../services/featureToggles"

import VoicemailPlayer from "../asset/voicemailPlayer"

const saveAs = require("libs/filesaver");
const errorService = require("services/error.service").errorServiceInstance;
const messageService = require("messages/messageService").default;
const State = require("asset/state");

const initService = require("services/initService");

const messagesModule = require("messages/messagesModule");

interface myScope {
	activeChat: Chat
	topicLoadingState: any,
	canSend: boolean,
	topicLoaded: boolean,
	hideOverlay: boolean,
	doHideOverlay: Function,
	downloadFile: Function,
	$apply: Function,
	$on: Function,
	attachments: any
	markRead: Function,
	loadMoreMessages: Function,
	remainingMessagesCount: number,
	loadingMessages: boolean
	newMessage: any
	sendMessage: Function,
	sendMessageState: any
	showMessageOptions: boolean,
	messageBursts: Function,
	toggleMessageOptions: Function,
	playVoicemail: Function,
	player: VoicemailPlayer
}

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

function messagesController($scope: myScope, $element, $stateParams, $timeout) {
	var topicLoadingState = new State.default();
	$scope.topicLoadingState = topicLoadingState.data;

	var chatID = h.parseDecimal($stateParams.topicid);

	$scope.canSend = false;
	$scope.topicLoaded = false;

	$scope.hideOverlay = false;

	$scope.doHideOverlay = function() {
		$scope.hideOverlay = true;
	};

	const getBlobFromURL = (blobURL: string) =>
		fetch(blobURL)
			.then((response) => response.blob())

	$scope.downloadFile = (file) => {
		const loadProgress = new Progress()

		file.getProgress = () => loadProgress.getProgress()

		blobService.getBlobUrl(file.blobID, file.type, loadProgress, file.size)
			.then((blobURL) => getBlobFromURL(blobURL))
			.then((blob) => saveAs(blob, file.name))
	}

	$scope.attachments = {
		imageUploads: [],
		fileUploads: [],
		removeImage: (index) => {
			$scope.attachments.imageUploads.splice(index, 1);
		},
		removeFile: (index) => {
			$scope.attachments.fileUploads.splice(index, 1);
		},
		addFiles: ImageUpload.fileCallback((files) => {
			$scope.$apply(() => {
				const imageUploads = files
					.filter((file) => ImageUpload.isImage(file))
					.map((file) => new ImageUpload(file))
				const fileUploads = files
					.filter((file) => !ImageUpload.isImage(file) && FeatureToggles.isFeatureEnabled("chat.fileTransfer"))
					.map((file) => new FileUpload(file))

				$scope.attachments.fileUploads = $scope.attachments.fileUploads.concat(fileUploads)
				$scope.attachments.imageUploads = $scope.attachments.imageUploads.concat(imageUploads)
			});
		})
	};

	$scope.markRead = function() {
		$scope.activeChat.markRead().catch(errorService.criticalError)
	};

	const loadVoicemail = (voicemail) => {
		const loadProgress = new Progress()

		voicemail.getProgress = () => loadProgress.getProgress()

		return blobService.getBlobUrl(voicemail.blobID, voicemail.type, loadProgress, voicemail.size).then((url) => {
			voicemail.url = url
			voicemail.loaded = true
		})
	}

	const playFiles = (voicemails) => {
		$scope.player = new VoicemailPlayer(voicemails.map(({ url, duration }) => ({
			url,
			estimatedDuration: duration
		})))

		$scope.player.play()
	}

	$scope.playVoicemail = (message) => {
		return Bluebird.resolve(message.voicemails).map((voicemail) => loadVoicemail(voicemail)).then(() => playFiles(message.voicemails))
	}

	$scope.loadMoreMessages = function() {
		$scope.loadingMessages = true;
		return $scope.activeChat.loadMoreMessages().then(function(remaining) {
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
	).then(function(chat: Chat) {
		messageService.setActiveChat(chatID);
		$scope.activeChat = chat;

		$scope.canSend = true;
		$scope.newMessage = false;
		return chat.loadInitialMessages().thenReturn(chat);
	}).then(function(chat: Chat) {
		$scope.topicLoaded = true;

		if (chat.getMessages().length > 0) {
			chat.markRead().catch(errorService.criticalError);
		}

		loadMoreUntilFull();

		return null;
	});

	errorService.failOnErrorPromise(topicLoadingState, loadTopicsPromise);

	var sendMessageState = new State.default();
	$scope.sendMessageState = sendMessageState.data;

	$scope.sendMessage = function() {
		sendMessageState.pending();

		const images = $scope.attachments.imageUploads;
		const files = $scope.attachments.fileUploads;
		const text = $scope.activeChat.newMessage;

		if (text === "" && images.length === 0 && files.length === 0) {
			sendMessageState.failed();
			return;
		}

		$scope.canSend = false;

		var sendMessagePromise = messageService.sendMessage($scope.activeChat.getID(), text, { images, files, voicemails: [] }).then(function() {
			$scope.activeChat.newMessage = "";
			$scope.attachments.imageUploads = []
			$scope.attachments.fileUploads = []
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
		if (!$scope.activeChat || $scope.activeChat.getMessages().length === 0) {
			return { changed: false, bursts: [] };
		}

		const messagesAndUpdates = $scope.activeChat.getMessages().map(({ id }) => MessageLoader.getLoaded(id))

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

(<any>messagesController).$inject = ["$scope", "$element", "$stateParams", "$timeout"];

messagesModule.controller("ssn.messagesShowController", messagesController);
