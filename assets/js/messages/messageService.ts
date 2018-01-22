import h from "../helper/helper";
import Observer from "../asset/observer"
import * as Bluebird from "bluebird";

import errorService from "../services/error.service"
import socket from "../services/socket.service"
import Cache from "../services/Cache"

import sessionService from "../services/session.service"
var initService = require("services/initService");

import ChunkLoader from "../messages/chatChunk"
import ChatLoader from "../messages/chat"
import MessageLoader from "../messages/message"
import ChatListLoader from "../messages/chatList"

new Cache("messageSend").deleteAll()

let activeChat = 0

const messageService = {
	notify: <any> null,
	allChatsLoaded: false,
	prependChatID: function (chatID) {
		if (!ChatListLoader.isLoaded(sessionService.getUserID())) {
			return
		}

		const chatList = ChatListLoader.getLoaded(sessionService.getUserID())
		const chatIDs = chatList.get()
		chatList.set([
			chatID,
			...chatIDs.filter((id) => id !== chatID)
		])
	},
	addSocketData: function (data) {
		if (!data) {
			return Bluebird.resolve()
		}

		return Bluebird.try(async () => {
			if (data.chat) {
				console.warn("Add chat")

				const chat = await ChatLoader.load(data.chat)
				messageService.prependChatID(chat.getID())
			}

			if (data.chunk) {
				console.warn("Add chunk")

				const chunk = await ChunkLoader.load(data.chunk)
				const chat = await ChatLoader.get(chunk.getChatID())

				chat.addChunkID(chunk.getID())
				messageService.prependChatID(chat.getID())
			}

			if (data.message) {
				console.warn("Add message")

				const chunk = await ChunkLoader.get(data.message.server.chunkID)
				const chat = await ChatLoader.get(chunk.getChatID())
				const message = await MessageLoader.load(data.message)

				chat.addMessage(message)

				if (!message.isOwn()) {
					chat.addUnreadMessage(message.getServerID())
				} else if (chat.getLatestMessage() === message.getClientID()) {
					chat.localMarkRead()
				}

				messageService.prependChatID(chat.getID())
				messageService.notify({ message, chat, chunk }, "message")
			}

			await Bluebird.resolve()
		})
	},
	getChatIDs: function () {
		const myID = sessionService.getUserID()

		if (!ChatListLoader.isLoaded(myID)) {
			return []
		}

		return ChatListLoader.getLoaded(myID).get()
	},
	setActiveChat: (_activeChat) => {
		activeChat = _activeChat
	},
	isActiveChat: (chatID) => {
		return chatID === activeChat
	},
	loadMoreChats: h.cacheUntilSettled((count = 20) => {
		return initService.awaitLoading().then(function () {
			return ChatListLoader.get(sessionService.getUserID())
		}).then(function () {
			const unloadedChatIDs = messageService.getChatIDs().filter(function (chatID) {
				return !ChatLoader.isLoaded(chatID)
			})

			if (unloadedChatIDs.length === 0) {
				messageService.allChatsLoaded = true
			}

			return unloadedChatIDs.slice(0, count)
		}).map((chatID) =>
			ChatLoader.get(chatID)
		)
	}),
	sendUnsentMessages: function () {
		var unsentMessages = new Cache("unsentMessages", { maxEntries: -1, maxBlobSize: -1 });

		return unsentMessages.all().map(function (unsentMessage: any) {
			var data = JSON.parse(unsentMessage.data);

			return messageService.getChat(data.chatID).then(function (chat) {
				return chat.sendUnsentMessage(data, unsentMessage.blobs);
			});
		});
	},
	getChat: function (chatID, cb?) {
		return Bluebird.try(function () {
			return ChatLoader.get(chatID);
		}).nodeify(cb);
	},
	getUserChat: function (userID, cb?) {
		return initService.awaitLoading().then(function () {
			return socket.definitlyEmit("chat.getChatWithUser", {
				userID
			});
		}).then(function (data) {
			if (data.chatID) {
				return data.chatID;
			}

			return false;
		}).nodeify(cb);
	}
};

Observer.extend(messageService);

socket.channel("notify.chat", function (e, data) {
	if (!e) {
		messageService.addSocketData(data)
	} else {
		errorService.criticalError(e);
	}
});

initService.awaitLoading().then(() => {
	messageService.sendUnsentMessages()
})

export default messageService
