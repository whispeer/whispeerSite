import * as Bluebird from 'bluebird';

import socketService from "../services/socket.service"

import ObjectLoader from "../services/objectLoader"

import ChunkLoader, { Chunk } from "./chatChunk"
import MessageLoader, { Message } from "./message"

import h from "../helper/helper"

import Cache from "../services/Cache";
import keyStore from "../services/keyStore.service"
import Observer from "../asset/observer"

const initService = require("services/initService");

const messageSendCache = new Cache("messageSend", { maxEntries: -1, maxBlobSize: -1 });

let unreadChatIDs = []

const addAfterTime = (arr:timeArray, id: any, time: number) => {
	const firstLaterIndex = arr.findIndex((ele) => ele.time > time)

	if (firstLaterIndex === -1) {
		return [
			...arr,
			{ id, time }
		]
	}

	return [
		...arr.slice(0, firstLaterIndex),
		{ id, time },
		...arr.slice(firstLaterIndex)
	]
}

type timeArray = {
	id: any,
	time: number
}[]

const getUnstoredMessages = () => {
	const messagesMap = MessageLoader.getAll() || {}

	const messages = Object.keys(messagesMap).map((id) => messagesMap[id])

	return messages.filter((m) => !m.hasBeenSent()).filter((m) => m.hasAttachments())
}

window.addEventListener("beforeunload", function (e) {
	const confirmationMessage = "Unsent files and images. Leave page anyway?"

	if (getUnstoredMessages().length > 0) {
		const event = e || window.event
		event.returnValue = confirmationMessage //Gecko + IE
		return confirmationMessage //Gecko + Webkit, Safari, Chrome etc.
	}

	return
});

export class Chat extends Observer {
	//Sorted IDs
	private messages:timeArray = []
	private chatUpdates:timeArray = []
	private messagesAndUpdates:timeArray = []

	private chunkIDs: number[] = []

	// Unsorted IDs
	private unreadMessageIDs: number[] = []

	private id: number

	private loadingInfo: {
		latestMessageID: number,
		latestChunkID: number
	}

	public newMessage = ""

	constructor({ id, latestMessageID, latestChunkID, unreadMessageIDs }) {
		super()

		this.id = id

		this.loadingInfo = {
			latestMessageID: latestMessageID,
			latestChunkID: latestChunkID,
		}

		this.unreadMessageIDs = unreadMessageIDs
	}

	getID = () => {
		return this.id
	}

	isUnread() {
		return unreadChatIDs.indexOf(this.id) > -1
	}

	removeMessageID = (removeID) => {
		this.messages = this.messages.filter(({ id }) => removeID !== id)
		this.messagesAndUpdates = this.messagesAndUpdates.filter(({ id: { id } }) => removeID !== id)
	}

	addMessageID = (id, time) => {
		const alreadyAdded = this.messages.find((message) => message.id === id)

		if (alreadyAdded) {
			return
		}

		this.messages = addAfterTime(this.messages, id, time)
		this.messagesAndUpdates = addAfterTime(this.messagesAndUpdates, { type: "message", id }, time)
	}

	addChatUpdateID = (id, time) => {
		const alreadyAdded = this.chatUpdates.find((chatUpdate) => chatUpdate.id === id)

		if (alreadyAdded) {
			return
		}

		this.chatUpdates = addAfterTime(this.chatUpdates, id, time)
		this.messagesAndUpdates = addAfterTime(this.messagesAndUpdates, { type: "chatUpdate", id }, time)
	}

	verifyMessageAssociations = (message: Message) => {
		return Bluebird.all([
			ChunkLoader.get(message.getChunkID()),
			ChunkLoader.get(h.array.last(this.chunkIDs)),
		]).then(([messageChunk, latestChunk]) => {
			message.verifyParent(messageChunk)

			return Chunk.loadChunkChain(latestChunk, messageChunk).thenReturn([latestChunk, messageChunk])
		}).then(([latestChunk, messageChunk]) => {
			latestChunk.ensureChunkChain(messageChunk)
		})
	}

	addChunkID = (chunkID) => {
		if (this.chunkIDs.indexOf(chunkID) > -1) {
			return
		}

		this.chunkIDs = [...this.chunkIDs, chunkID].sort((a, b) => a - b)
	}

	load = h.cacheResult<Bluebird<any>>(() => {
		return Bluebird.try(async () => {
			const { latestChunkID, latestMessageID } = this.loadingInfo

			const latestChunk = await ChunkLoader.get(latestChunkID)

			this.chunkIDs = [latestChunk.getID()]

			if (!latestMessageID) {
				return
			}

			const latestMessage = await MessageLoader.get(latestMessageID)

			await this.verifyMessageAssociations(latestMessage)

			this.addMessageID(latestMessage.getClientID(), latestMessage.getTime())
		})
	})

	loadMoreMessages() {
		const oldestKnownMessage = this.messages.length === 0 ? 0 : MessageLoader.getLoaded(this.messages[0].id).getServerID()

		return Bluebird.try(async () => {
			const { messages, chunks = [], remainingMessagesCount } = await socketService.emit("chat.getMessages", {
				id: this.getID(),
				oldestKnownMessage
			})

			await Bluebird.all<Chunk>(chunks.map((chunk) => ChunkLoader.load(chunk)))

			const messagesObjects = await Bluebird.all<Message>(messages.map((message) => MessageLoader.load(message)))

			await Bluebird.all(messagesObjects.map((message) => this.verifyMessageAssociations(message)))

			messagesObjects.forEach((message) =>
				this.addMessageID(message.getClientID(), message.getTime())
			)

			return { remaining: remainingMessagesCount }
		})
	}

	loadInitialMessages = h.cacheResult<Bluebird<any>>(() => {
		return this.loadMoreMessages()
	})

	getMessages() {
		return this.messages
	}

	getMessagesAndUpdates() {
		return this.messagesAndUpdates
	}

	getChatUpdates() {
		return this.chatUpdates
	}

	getLatestChatUpdate() {
		if (this.chatUpdates.length > 0) {
			return h.array.last(this.chatUpdates).id
		}
	}

	getLatestChunk() {
		return h.array.last(this.chunkIDs)
	}

	getLatestMessage() {
		if (this.messages.length > 0) {
			return h.array.last(this.messages).id
		}
	}

	localMarkRead() {
		if (this.unreadMessageIDs.length === 0 && unreadChatIDs.indexOf(this.id) === -1) {
			return
		}

		this.unreadMessageIDs = []
		unreadChatIDs = unreadChatIDs.filter((id) => id !== this.id)

		this.notify(this.getID(), "read")
	}

	markRead() {
		this.localMarkRead()

		return socketService.definitlyEmit("chat.markRead", { id: this.id })
	}

	getUnreadMessageIDs = () => {
		return this.unreadMessageIDs
	}

	addUnreadMessage(id) {
		if (this.unreadMessageIDs.indexOf(id) === -1) {
			this.unreadMessageIDs.push(id)
		}

		if (unreadChatIDs.indexOf(this.id) === -1) {
			unreadChatIDs.push(this.id)
		}
	}

	isAdmin = (user) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.isAdmin(user)
	}

	amIAdmin = () => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.amIAdmin()
	}

	getReceivers = () => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.getReceivers()
	}

	getReceiverIDs = () => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.getReceiverIDs()
	}

	getTitle = () => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.getTitle()
	}

	getPartners = () => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.getPartners()
	}

	removeReceiver = (receiver) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())
		const oldReceiverIDs = latestChunk.getReceiver()
		const newReceiverIDs = oldReceiverIDs.filter((id) => id !== receiver.getID())

		return this.createSuccessor(newReceiverIDs, {})
	}

	addAdmin = (receiver) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		const adminIDs = latestChunk.getAdmins()

		if (adminIDs.indexOf(receiver.getID()) > -1) {
			return Bluebird.resolve()
		}

		return this.setAdmins([...adminIDs, receiver.getID()])
	}

	getAdmins = () => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.getAdmins()
	}

	setAdmins = (admins) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())
		return this.createSuccessor(latestChunk.getReceiver(), { admins })
	}

	addReceivers = (newReceiverIDs, canReadOldMessages = false) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		const oldReceivers = latestChunk.getReceiver()

		return this.createSuccessor(oldReceivers.concat(newReceiverIDs), { canReadOldMessages })
	}

	loadAllChunks = () => {
		return socketService.emit("chat.getChunks", { id: this.id }).then(({ chunks }) =>
			chunks
		).map((chunk) =>
			ChunkLoader.load(chunk)
		)
	}

	private encryptAllChunksForReceiver = (chunkData, addedReceiver: number[]) => {
		return this.loadAllChunks().then((chunks) => {
			chunks.sort((c1, c2) => c1.getID() - c2.getID())

			chunks.forEach((chunk, index) => {
				if (chunks[index + 1] && chunks[index + 1].getPredecessorID() !== chunk.getID()) {
					throw new Error("chunk chain invalid")
				}
			})

			const receiverKeys = addedReceiver.map((receiver) =>
				chunkData.receiverKeys[receiver]
			)

			const chunkKeys = chunks.map((chunk) => chunk.getSecuredData().metaAttr("_key")).filter((value, index, self) =>
				self.indexOf(value) === index
			)

			return Bluebird.all(receiverKeys.map((receiverKey) =>
				Bluebird.all(chunkKeys.map((chunkKey) => {
					return keyStore.sym.symEncryptKey(chunkKey, receiverKey)
				})
			))).thenReturn([chunkKeys, receiverKeys])
		}).then(([chunkKeys, receiverKeys]) => {
			return { ...chunkData, previousChunksDecryptors: keyStore.upload.getDecryptors(chunkKeys, receiverKeys) }
		})
	}

	private createSuccessor = (receiver, options : { canReadOldMessages? : boolean, title? : String, admins? : number[] }) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		const {
			canReadOldMessages = false,
			title = latestChunk.getTitle(),
			admins = latestChunk.getAdmins(),
		} = options

		if (!latestChunk.amIAdmin()) {
			throw new Error("Not an admin of this chunk")
		}

		const addedReceiver = receiver.filter((id) => latestChunk.getReceiver().indexOf(id) === -1)
		const removedReceiver = latestChunk.getReceiver().filter((id) => receiver.indexOf(id) === -1)

		if (removedReceiver.length > 0 && canReadOldMessages) {
			throw new Error("Can not remove receiver and allow reading of old messages")
		}

		return latestChunk.getSuccessor().then((successor) => {
			if (successor) {
				throw new Error("TODO: Chunk has a successor. Try again?")
			}

			const content = { title }
			const meta = { admins }

			const newKey = addedReceiver.length > 0 && removedReceiver.length > 0

			return Chunk.createRawData(receiver, {
				content,
				meta,
				predecessorChunk: latestChunk,
				givenKey: !newKey && latestChunk ? latestChunk.getKey() : null
			})
		}).then((chunkData) => {
			if (!canReadOldMessages || addedReceiver.length === 0) {
				return chunkData
			}

			return this.encryptAllChunksForReceiver(chunkData, addedReceiver)
		}).then(({ chunk, keys, receiverKeys, previousChunksDecryptors }) => {
			return socketService.emit("chat.chunk.create", {
				predecessorID: latestChunk.getID(),
				chunk,
				keys,
				receiverKeys,
				previousChunksDecryptors,
				canReadOldMessages
			})
		}).then((response: any) => {
			return ChunkLoader.load(response.chunk)
		}).then((chunk) => {
			this.addChunkID(chunk.getID())
		})
	}

	setTitle = (title) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return this.createSuccessor(latestChunk.getReceiverIDs(), { title })
	}

	sendUnsentMessage = (messageData, files) => {
		if (files.length > 0) {
			return
		}

		return this.sendMessage(messageData.message, { images: [], files: [] }, messageData.id);
	};

	private storeMessage = (messageObject, message, attachments, id) => {
		if (!id) {
			return Bluebird.resolve()
		}

		if (attachments.images.length > 0 && attachments.files.length > 0) {
			return Bluebird.resolve()
		}

		return Bluebird.try(() =>
			messageSendCache.store(
				messageObject.getClientID(),
				{
					chatID: this.getID(),
					id: messageObject.getClientID(),
					message: message
				}
			)
		)
	}

	sendMessage = (message, attachments, id?) => {
		var messageObject = new Message(message, this, attachments, id)

		this.storeMessage(messageObject, message, attachments, id).finally(() => {
			var sendMessagePromise = messageObject.sendContinously();

			sendMessagePromise.then(() => {
				this.removeMessageID(messageObject.getClientID())
				this.addMessageID(messageObject.getClientID(), messageObject.getTime())

				return messageSendCache.delete(messageObject.getClientID());
			});

			sendMessagePromise.catch((e) => {
				console.error(e);
				alert("An error occured sending a message!" + e.toString());
			});

			MessageLoader.addLoaded(messageObject.getClientID(), messageObject)
			this.addMessageID(messageObject.getClientID(), Number.MAX_SAFE_INTEGER)
		})

		return null;
	};

	static getUnreadChatIDs() {
		return unreadChatIDs
	}
}

const loadHook = (chatResponse) => {
	const loadChunks = Bluebird.all(chatResponse.chunks.map((chunkData) =>
		ChunkLoader.load(chunkData)
	))

	const loadMessages = Bluebird.all(chatResponse.messages.map((messageData) =>
		MessageLoader.load(messageData)
	))

	const chat = new Chat(chatResponse.chat)

	return Bluebird.all([
		loadChunks,
		loadMessages,
	]).then(() => chat.load()).thenReturn(chat)
}

const downloadHook = (id) => {
	return socketService.emit("chat.get", { id }).then((response) => response.chat)
}

const idHook = (response) => response.chat.id

const hooks = {
	downloadHook, loadHook, idHook
}

export default class ChatLoader extends ObjectLoader(hooks) {}

let lastLoaded = 0

const localMarkChatsRead = (unreadIDs) => {
	const chats = ChatLoader.getAll()

	Object.keys(chats).forEach((id) => {
		const chat = chats[id]

		if (unreadIDs.indexOf(chat.getID()) !== -1) {
			return
		}

		chat.localMarkRead()
	})

	unreadChatIDs = unreadIDs
}

socketService.channel("unreadChats", (e, data) => {
	if (e) {
		console.warn(e)
	}

	if (!data.unreadChatIDs) {
		console.warn("got no chat ids from socket channel")
		return
	}

	localMarkChatsRead(data.unreadChatIDs)
})

const loadUnreadChatIDs = () => {
	if (new Date().getTime() - lastLoaded < 5 * 1000) {
		return
	}

	return initService.awaitLoading().then(function () {
		return Bluebird.delay(500);
	}).then(function () {
		return socketService.awaitConnection();
	}).then(function () {
		return socketService.emit("chat.getUnreadIDs", {});
	}).then(function (data) {
		if (!data.chatIDs) {
			console.warn("got no chat ids from socket request")
			return
		}

		localMarkChatsRead(data.chatIDs);
	});
}

socketService.on("connect", function () {
	loadUnreadChatIDs();
});

initService.listen(function () {
	loadUnreadChatIDs();
}, "initDone");