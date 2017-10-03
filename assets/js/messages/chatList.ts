import * as Bluebird from "bluebird"

import ObjectLoader from "../services/mutableObjectLoader"
import socketService from "../services/socket.service"
import sessionService from "../services/session.service"

import ChatLoader from "./chat"

type ChatIDList = number[]

export class ChatList {
	constructor(private chatIDs: ChatIDList) {}

	get() {
		return this.chatIDs
	}

	set(chatIDs: ChatIDList) {
		this.chatIDs = chatIDs
	}
}

export default class ChatListLoader extends ObjectLoader<ChatList, ChatIDList>({
	download: () => socketService.definitlyEmit("chat.getAllIDs", {}).then(response => response.chatIDs),
	load: chatResponse => Bluebird.resolve(chatResponse),
	getID: () => sessionService.getUserID(),
	restore: (chatIDs, previousInstance) => {
		const firstLoadedIndex = chatIDs.findIndex((id) => ChatLoader.isLoaded(id))
		const chatsToLoad = firstLoadedIndex === -1 ? [] : chatIDs.slice(0, firstLoadedIndex)

		return Bluebird.all(chatsToLoad.map((id) => ChatLoader.get(id))).then(() => {
			if (previousInstance) {
				previousInstance.set(chatIDs)

				return previousInstance
			}

			return new ChatList(chatIDs)
		})
	},
	shouldUpdate: () => Bluebird.resolve(true),
	cacheName: "chatList"
}) {}
