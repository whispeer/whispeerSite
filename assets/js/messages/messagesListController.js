"use strict";

const messageService = require("messages/messageService").default;
const jQuery = require("jquery");
const State = require("asset/state");
const Bluebird = require("bluebird");
const controllerModule = require("controllers/controllerModule");

const ChatLoader = require("messages/chat").default
const ChunkLoader = require("messages/chatChunk").default
const MessageLoader = require("messages/message").default

const Chat = require("messages/chat").Chat

const Memoizer = require("asset/memoizer").default

const getMessageInfo = (latestMessageID) => {
	if (!MessageLoader.isLoaded(latestMessageID)) {
		return {
			latestMessageText: ""
		}
	}

	const latestMessage = MessageLoader.getLoaded(latestMessageID)

	return {
		time: latestMessage.getTime(),
		latestMessageText: latestMessage.getText(),
	}
}

const memoizer = new Memoizer([
	() => messageService.getChatIDs(),
	() => ChatLoader.getAll(),
	() => Chat.getUnreadChatIDs()
], (chatIDs) => {
	let loaded = true

	return chatIDs.filter((chatID) => {
		loaded = loaded && ChatLoader.isLoaded(chatID)

		return loaded
	}).map((chatID) => {
		const chat = ChatLoader.getLoaded(chatID)

		const latestChunk = ChunkLoader.getLoaded(chat.getLatestChunk())

		const chatInfo = {
			id: chat.getID(),

			unread: chat.isUnread(),
			unreadCount: chat.getUnreadMessageIDs().length,
		}

		const chunkInfo = {
			partners: latestChunk.getPartners(),
			partnersDisplay: latestChunk.getPartnerDisplay(),
			title: latestChunk.getTitle(),
			time: latestChunk.getTime(),
			type: latestChunk.getReceiver().length > 2 ? "groupChat" : "peerChat"
		}

		const messageInfo = getMessageInfo(chat.getLatestMessage())

		return Object.assign({}, chatInfo, chunkInfo, messageInfo)
	}).sort((a, b) =>
		b.time - a.time
	)
})

function messagesController($scope, $state, $stateParams, $element) {
	const chatsLoadingState = new State.default();
	$scope.chatsLoadingState = chatsLoadingState.data;

	$scope.getChats = () => {
		return memoizer.getValue()
	}

	function loadChats() {
		if (messageService.allChatsLoaded) {
			return;
		}

		if (chatsLoadingState.isPending()) {
			return;
		}

		chatsLoadingState.pending();
		return messageService.loadMoreChats().then(function() {
			chatsLoadingState.success();
		}).catch(function() {
			chatsLoadingState.failed();
		});
	}

	function loadMoreUntilFull() {
		if (messageService.allChatsLoaded) {
			return;
		}

		Bluebird.delay(500).then(function() {
			var scroller = $element.find("#topicListWrap");

			var outerHeight = scroller.height();
			var innerHeight = 0;
			scroller.children().each(function() {
				innerHeight = innerHeight + jQuery(this).outerHeight(true);
			});

			if (outerHeight > innerHeight) {
				return loadChats().then(function() {
					loadMoreUntilFull();
				});
			}
		});
	}

	loadMoreUntilFull();

	$scope.loadMoreChats = function() {
		return loadChats();
	};

	$scope.isActiveChat = function(chat) {
		return (messageService.isActiveChat(parseInt(chat.id, 10)));
	};

	$scope.shortenMessage = function(string) {
		if (!string) {
			return "";
		}

		if (string.length > 100) {
			return string.substr(0, 97) + "...";
		} else {
			return string;
		}
	};
}


messagesController.$inject = ["$scope", "$state", "$stateParams", "$element"];

controllerModule.controller("ssn.messagesListController", messagesController);
