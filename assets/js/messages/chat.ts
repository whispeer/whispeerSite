import * as Bluebird from 'bluebird';

import socketService from "../services/socket.service"

import ObjectLoader, { SYMBOL_UNCHANGED } from "../services/mutableObjectLoader"

import ChunkLoader, { Chunk } from "./chatChunk"
import MessageLoader, { Message } from "./message"

import h from "../helper/helper"

import Cache from "../services/Cache";
import keyStore from "../services/keyStore.service"
import Observer from "../asset/observer"
import settings from "../services/settings.service"
import sessionService from "../services/session.service"

const initService = require("services/initService");

const messageSendCache = new Cache("unsentMessages", { maxEntries: -1, maxBlobSize: -1 });

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

const verifyMessageAssociations = (message: Message, latestChunkID: number) => {
	return Bluebird.all([
		ChunkLoader.get(message.getChunkID()),
		ChunkLoader.get(latestChunkID),
	]).then(([messageChunk, latestChunk]) => {
		message.verifyParent(messageChunk)

		return Chunk.loadChunkChain(latestChunk, messageChunk).thenReturn([latestChunk, messageChunk])
	}).then(([latestChunk, messageChunk]) => {
		latestChunk.ensureChunkChain(messageChunk)
	})
}

export class Chat extends Observer {
	//Sorted IDs
	private messages:timeArray = []
	private chatUpdates:timeArray = []

	private chunkIDs: number[] = []

	private loadMissingMessagesPromise = Bluebird.resolve()
	private waitingMissingMessages = false

	private lastStoredInfo: {
		id: any,
		unreadMessageIDs: any[],
		latestMessageID: any,
		latestChunkID: any
	}

	// Unsorted IDs
	private unreadMessageIDs: number[] = []

	private id: number
	private draft: boolean = false

	public newMessage = ""

	constructor({ id, latestMessage, latestChunk, unreadMessageIDs }, draft?: boolean) {
		super()

		this.id = id
		this.draft = draft

		this.update({ latestChunk, latestMessage, unreadMessageIDs })
	}

	getInfo = () => ({
		id: this.id,
		unreadMessageIDs: this.unreadMessageIDs,
		latestMessageID: this.getLatestSentMessage(),
		latestChunkID: this.getLatestChunk()
	})

	private store = () => {
		if (this.draft) {
			return
		}

		const storeInfo = this.getInfo()

		if (h.deepEqual(this.lastStoredInfo, storeInfo)) {
			return
		}

		this.lastStoredInfo = storeInfo

		ChatLoader.updateCache(this.id, storeInfo)
	}

	create = ({ id, latestChunkID }) => {
		this.draft = false

		this.id = id
		this.chunkIDs = [latestChunkID]

		ChatLoader.addLoaded(id, this)
		ChatLoader.removeLoaded(-1)
	}

	isBlocked = () => {
		if (this.getReceiverIDs.length > 2) {
			return false
		}

		const otherReceiver = this.getReceiverIDs().find((id) => id !== sessionService.getUserID())
		return settings.isBlocked(otherReceiver)
	}

	update = ({ latestChunk, latestMessage, unreadMessageIDs }) => {
		this.unreadMessageIDs = unreadMessageIDs

		this.addChunkID(latestChunk.getID(), false)

		if (latestMessage) {
			this.addMessage(latestMessage, false)
		}
	}

	getID = () => {
		return this.id
	}

	isUnread() {
		return unreadChatIDs.indexOf(this.id) > -1
	}

	isMessageUnread = (message: Message) =>
			this.unreadMessageIDs.indexOf(message.getClientID()) > -1

	private removeMessageID = (removeID) => {
		this.messages = this.messages.filter(({ id }) => removeID !== id)
	}

	addMessage = (message: Message, updateCache = true) => {
		this.addMessageID(message.getClientID(), message.getTime(), updateCache)

		this.scheduleLoadMissingMessages()
	}

	private addMessageID = (id, time, updateCache = true) => {
		const alreadyAdded = this.messages.find((message) => message.id === id)

		if (alreadyAdded) {
			return
		}

		this.messages = addAfterTime(this.messages, id, time)

		if (updateCache) {
			this.store()
		}
	}

	verifyMessageAssociations = (message: Message) =>
		verifyMessageAssociations(message, h.array.last(this.chunkIDs))

	addChunkID = (chunkID, updateCache = true) => {
		if (this.chunkIDs.indexOf(chunkID) > -1) {
			return
		}

		this.chunkIDs = [...this.chunkIDs, chunkID].sort((a, b) => a - b)

		if (updateCache) {
			this.store()
		}
	}

	private hasMessage = (id) =>
		this.messages.find((message) => message.id === id)

	private loadPreviousMessagesFromCache = (message: Message, limit = 20) => {
		const messagesLoaded = []

		return Bluebird.try(async () => {
			let currentMessage = message

			for (let i = 0; i < limit; i += 1) {
				if (!currentMessage.getPreviousID()) {
					return messagesLoaded
				}

				const previousMessage = await MessageLoader.getFromCache(currentMessage.getPreviousID())

				await this.verifyMessageAssociations(previousMessage)

				if (this.hasMessage(previousMessage.getClientID())) {
					return messagesLoaded
				}

				messagesLoaded.push(previousMessage)

				currentMessage = previousMessage
			}

			return messagesLoaded
		}).catch(() => messagesLoaded).then((messages) => {
			messages.forEach((m) => this.addMessage(m))
			return messages
		})
	}

	private loadMissingMessages = () => {
		return Bluebird.try(async () => {
			const batchSizes = [1, 3, 10, 20]
			let iteration = 0, batchSize

			while(batchSize = batchSizes[iteration++]) {
				const knownMessages = this.messages
					.map(({ id }) => MessageLoader.getLoaded(id))
					.filter((m) => m.hasBeenSent())

				if (knownMessages.length < 2) {
					return
				}

				const ids = knownMessages.map((m) => m.getClientID())

				const messagesWithoutPredecessor = knownMessages.filter((m) =>
					ids.indexOf(m.getPreviousID()) === -1
				).sort((a, b) => a.getTime() - b.getTime())

				if (knownMessages.filter((m) => !m.getPreviousID()).length > 1) {
					console.warn("Got more than one last message in chat. Aborting!")
					return
				}

				if (messagesWithoutPredecessor.length === 1) {
					console.warn("No more missing messages")
					return
				}

				console.warn(`Loading batch size ${batchSize} messages. Missing ${messagesWithoutPredecessor.length}`)

				await Bluebird.all(messagesWithoutPredecessor.map((m) => {
					return this.loadOlderMessages(m, batchSize)
				}))
			}

			//TODO we were unable to finish in 34 messages :(
			//TODO remove everything except first block
		})
	}

	// TODO: Check if this leaks memory
	scheduleLoadMissingMessages = () => {
		if (this.messages.length < 2) {
			return
		}

		if (this.waitingMissingMessages) {
			return
		}

		this.waitingMissingMessages = true

		console.warn("Scheduling missing message check")

		this.loadMissingMessagesPromise = this.loadMissingMessagesPromise
			.delay(50)
			.finally(() => {
				this.waitingMissingMessages = false
				return this.loadMissingMessages()
			})

		return this.loadMissingMessagesPromise
	}

	loadOlderMessages(message: Message, limit = 20) {
		return Bluebird.try(async () => {
			if (message) {
				const messagesFromCache = await this.loadPreviousMessagesFromCache(message, limit)

				limit -= messagesFromCache.length

				if (limit < 1) {
					return
				}

				if (messagesFromCache.length > 0) {
					message = h.array.last(messagesFromCache)
				}
			}

			const { messages, chunks = [], remainingMessagesCount } = await socketService.definitlyEmit("chat.getMessages", {
				id: this.getID(),
				oldestKnownMessage: message ? message.getServerID() : 0,
				limit
			})

			await Bluebird.all<Chunk>(chunks.map((chunk) => ChunkLoader.load(chunk)))

			const messagesObjects = await Bluebird.all<Message>(messages.map((message) => MessageLoader.load(message)))
			await Bluebird.all(messagesObjects.map((message) => this.verifyMessageAssociations(message)))

			messagesObjects.forEach((message) =>
				this.addMessage(message)
			)

			return remainingMessagesCount
		})
	}

	loadMoreMessages() {
		if (this.draft) {
			return Bluebird.resolve(0)
		}

		const oldestKnownMessage = this.messages.length === 0 ? null : MessageLoader.getLoaded(this.messages[0].id)

		return this.loadOlderMessages(oldestKnownMessage)
	}

	loadInitialMessages = h.cacheResult<Bluebird<any>>(() => this.loadMoreMessages())

	getMessages() {
		return this.messages
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

	getLatestSentMessage() {
		const messages = this.messages.map(({ id }) => MessageLoader.getLoaded(id)).filter((m) => m.hasBeenSent())

		if (messages.length > 0) {
			return h.array.last(messages).getClientID()
		}
	}

	localMarkRead() {
		if (this.unreadMessageIDs.length === 0 && unreadChatIDs.indexOf(this.id) === -1) {
			return
		}

		this.unreadMessageIDs = []
		unreadChatIDs = unreadChatIDs.filter((id) => id !== this.id)

		this.notify(this.getID(), "read")
		this.store()
	}

	markRead() {
		this.localMarkRead()

		if (this.draft) {
			return Bluebird.resolve()
		}

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

		this.store()
	}

	isAdmin = (user) => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return latestChunk.isAdmin(user)
	}

	amIAdmin = () => {
		const latestChunk = ChunkLoader.getLoaded(this.getLatestChunk())

		return !this.isDraft() && latestChunk.amIAdmin()
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

			const newKey = addedReceiver.length > 0 || removedReceiver.length > 0

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

		return this.sendMessage(messageData.message, { images: [], files: [], voicemails: [] }, messageData.id);
	};

	private storeMessage = (messageObject, message, id) => {
		if (id) {
			return Bluebird.resolve()
		}

		if (this.draft) {
			return Bluebird.resolve()
		}

		if (messageObject.hasAttachments()) {
			return Bluebird.resolve()
		}

		return Bluebird.try(() =>
			messageSendCache.store(
				messageObject.getClientID(),
				{
					chatID: this.getID(),
					id: messageObject.getClientID(),
					message
				}
			)
		)
	}

	isDraft = () => this.draft

	sendMessage = (message, attachments, id?) => {
		var messageObject = new Message(message, this, attachments, id)

		MessageLoader.addLoaded(messageObject.getClientID(), messageObject)
		this.addMessageID(messageObject.getClientID(), Number.MAX_SAFE_INTEGER)

		return this.storeMessage(messageObject, message, id).finally(() => {
			var sendMessagePromise = messageObject.sendContinously();

			sendMessagePromise.then(() => {
				this.removeMessageID(messageObject.getClientID())
				this.addMessage(messageObject)

				return messageSendCache.delete(messageObject.getClientID());
			});

			sendMessagePromise.catch((e) => {
				console.error(e);
				alert("An error occured sending a message!" + e.toString());
			});

			return sendMessagePromise
		})
	};

	static getUnreadChatIDs() {
		return unreadChatIDs
	}
}

type ChatCache = {
	id: number,
	latestMessageID: any,
	latestChunkID: any,
	unreadMessageIDs: any
}

const loadChatInfo = (ids) =>
	socketService.definitlyEmit("chat.getMultiple", { ids })
		.then(({ chats }) =>
			ids.map((id) => chats.find(({ chat }) => h.parseDecimal(chat.id) === h.parseDecimal(id)))
		)

const getChatInfo = h.delayMultiplePromise(Bluebird, 50, loadChatInfo, 10)

export default class ChatLoader extends ObjectLoader<Chat, ChatCache>({
	download: (id) => {
		return getChatInfo(id).then((chatInfo) => {
			if (h.parseDecimal(chatInfo.chat.id) !== h.parseDecimal(id)) {
				throw new Error(`Chat ID incorrect after loading. Should be ${id} but is ${chatInfo.chat.id}`)
			}
			return chatInfo
		})
	},

	load: (chatResponse, previousInstance) => {
		if (previousInstance && h.deepEqual(previousInstance.getInfo(), chatResponse.chat)) {
			return Bluebird.resolve(SYMBOL_UNCHANGED)
		}

		const loadChunks = Bluebird.all(chatResponse.chunks.map((chunkData) =>
			ChunkLoader.load(chunkData)
		))

		const loadMessages = Bluebird.all(chatResponse.messages.map((messageData) =>
			MessageLoader.load(messageData)
		))

		const { id, latestMessageID, latestChunkID, unreadMessageIDs } = chatResponse.chat

		return Bluebird.all([
			loadChunks,
			loadMessages,
		]).thenReturn({ id, latestMessageID, latestChunkID, unreadMessageIDs })
	},
	getID: (response) => response.chat.id,
	restore: (chatInfo, previousInstance) => {
		return Bluebird.try(async function () {
			const { id, latestMessageID, latestChunkID, unreadMessageIDs } = chatInfo

			const latestMessage = latestMessageID ? await MessageLoader.get(latestMessageID) : null
			const latestChunk = await ChunkLoader.get(latestChunkID)

			if (latestMessage) {
				await verifyMessageAssociations(latestMessage, latestChunk.getID())
			}

			if (previousInstance) {
				previousInstance.update({ unreadMessageIDs, latestMessage, latestChunk })
				return previousInstance
			}

			return new Chat({
				id,
				latestMessage,
				latestChunk,
				unreadMessageIDs
			})
		})
	},
	shouldUpdate: (_event, instance) => Bluebird.resolve(!instance.isDraft()),
	cacheName: "chat"
}) {}

let lastLoaded = 0

const setUnreadChatIDs = (unreadIDs) => {
	const chats = ChatLoader.getAll()

	Object.keys(chats).forEach((id) => {
		const chat = chats[id].instance

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

	setUnreadChatIDs(data.unreadChatIDs)
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

		setUnreadChatIDs(data.chatIDs);
	});
}

socketService.on("connect", function () {
	loadUnreadChatIDs();
});

initService.listen(function () {
	loadUnreadChatIDs();
}, "initDone");
