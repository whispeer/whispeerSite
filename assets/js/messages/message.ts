import * as Bluebird from "bluebird"

const userService = require("users/userService").default
const keyStore = require("services/keyStore.service").default
const SecuredData = require("asset/securedDataWithMetaData")

import h from "../helper/helper"
import socket from "../services/socket.service"
import ObjectLoader from "../services/cachedObjectLoader"
import ChunkLoader, { Chunk } from "./chatChunk"
import { Chat } from "./chat"
import FileUpload from "../services/fileUpload.service"
import ImageUpload from "../services/imageUpload.service"
import blobService from "../services/blobService"
import Progress from "../asset/Progress"
import settings from "../services/settings.service"

type attachments = { images: ImageUpload[], files: FileUpload[], voicemails: FileUpload[] }

const extractImagesInfo = (infos, key) => {
	return infos.map((info) =>
		h.objectMap(info, (val) => val[key])
	)
}

export class Message {
	private wasSent: boolean
	private isOwnMessage: boolean

	private serverID: number
	private clientID: any
	private previousID: any
	private securedData: any
	private attachments: attachments

	private sendTime: number

	public data: any

	private chunkID: number

	private chat: Chat

	constructor(messageData, chat?: Chat, attachments?: attachments, id?) {
		if (chat) {
			this.initializePending(chat, messageData, attachments, id)
		} else {
			this.initialize(messageData)
		}
	}

	private initialize = ({ meta, content, server, sender }) => {
		this.wasSent = true

		const { serverID, clientID } = Message.idFromData(server)
		this.serverID = serverID
		this.clientID = clientID

		this.previousID = server.previousMessage

		this.chunkID = server.chunkID

		this.sendTime = h.parseDecimal(server.sendTime)

		this.securedData = SecuredData.createRaw(content, meta, { type: "message" })

		this.setDefaultData()

		this.data.sender = sender.data
		this.isOwnMessage = sender.isOwn()

		this.setAttachmentInfo("files")
		this.setAttachmentInfo("voicemails")
		this.setImagesInfo()
	}

	private initializePending = (chat: Chat, message, attachments: attachments, id) => {
		this.wasSent = false

		this.chat = chat
		this.attachments = attachments

		this.clientID = id || h.generateUUID()

		const meta = {
			createTime: new Date().getTime(),
			messageUUID: this.clientID
		}

		this.securedData = Message.createRawSecuredData(message, meta)

		this.setDefaultData()

		this.data.sender = userService.getOwn().data
		this.isOwnMessage = true

		this.data.images = attachments.images.map((image) => {
			if (!image.convertForGallery) {
				return image
			}

			return image.convertForGallery()
		})

		this.data.files = attachments.files.map((file) => ({
			...file.getInfo(),
			getProgress: () => {
				return file.getProgress()
			}
		}))

		this.data.voicemails = attachments.voicemails.map((voicemail) => ({
			...voicemail.getInfo(),
			getProgress: () => {
				return voicemail.getProgress()
			}
		}))

		this.prepareAttachments()
	}

	static prepare = (uploads) => Bluebird.resolve(uploads).map((upload: any) => upload.prepare())

	hasAttachments = () => {
		return this.attachments.images.length !== 0 || this.attachments.files.length !== 0 || this.attachments.voicemails.length !== 0
	}

	isBlockedSince = () =>
		settings.isBlockedSince(this.data.sender.id, this.getTime())

	isBlocked = () =>
		settings.isBlocked(this.data.sender.id)

	private prepareAttachments = () => {
		return Bluebird.all([
			Message.prepare(this.attachments.files),
			Message.prepare(this.attachments.images),
			Message.prepare(this.attachments.voicemails)
		])
	}

	static setAttachmentsInfo = (securedData, attachments: attachments) => {
		return Bluebird.try(async function () {
			const imagesInfo = await Message.prepare(attachments.images)
			const voicemailsInfo = await Message.prepare(attachments.voicemails)
			const filesInfo = await Message.prepare(attachments.files)

			if (imagesInfo.length > 0 || filesInfo.length > 0 || voicemailsInfo.length > 0) {
				securedData.metaSetAttr("images", extractImagesInfo(imagesInfo, "meta"))
				securedData.contentSetAttr("images", extractImagesInfo(imagesInfo, "content"))

				securedData.metaSetAttr("files", filesInfo.map((info) => info.meta))
				securedData.contentSetAttr("files", filesInfo.map((info) => info.content))

				securedData.metaSetAttr("voicemails", voicemailsInfo.map((info) => info.meta))
				securedData.contentSetAttr("voicemails", voicemailsInfo.map((info) => info.content))
			} else {
				securedData.contentSet(securedData.contentGet().message)
			}
		})
	}

	private setDefaultData = () => {
		const content = this.securedData.contentGet()

		this.data = {
			text: typeof content === "string" ? content : content.message,
			timestamp: this.getTime(),
			date: new Date(this.getTime()),

			sent: this.wasSent,

			id: this.clientID,
			obj: this
		}
	}

	getChunkID = () => {
		return this.chunkID || this.chat.getLatestChunk()
	}

	hasBeenSent = () => {
		return this.wasSent
	}

	uploadAttachments = h.cacheResult<Bluebird<any>>((chunkKey) => {
		return this.prepareAttachments().then(() => {
			const attachments = [...this.attachments.images, ...this.attachments.files, ...this.attachments.voicemails]

			return Bluebird.all(attachments.map((attachment) => {
				return attachment.upload(chunkKey)
			}))
		}).then((imageKeys) => {
			return h.array.flatten(imageKeys)
		})
	})

	sendContinously = h.cacheResult<any>(() => {
		return h.repeatUntilTrue(Bluebird, () => {
			return this.send()
		}, 2000)
	})

	send = () => {
		if (this.wasSent) {
			throw new Error("trying to send an already sent message")
		}

		return Bluebird.try(async () => {
			await socket.awaitConnection()

			const chunk = await ChunkLoader.get(this.chat.getLatestChunk())

			this.securedData.setParent(chunk.getSecuredData())

			await Message.setAttachmentsInfo(this.securedData, this.attachments)

			const chunkKey = chunk.getKey()

			const messageIDs = this.chat.getMessages()

			const messages = messageIDs.filter(({ id }) =>
				MessageLoader.isLoaded(id)
			).map(({ id }) =>
				MessageLoader.getLoaded(id)
			)

			const sentMessages = messages.filter((m) => m.hasBeenSent())
			const unsentMessages = messages.filter((m) => !m.hasBeenSent())

			const messageIndex = unsentMessages.findIndex((m) => m === this)

			if (unsentMessages[messageIndex - 1]) {
				await unsentMessages[messageIndex - 1].sendContinously()
			}

			const newest = h.array.last(sentMessages)

			if (newest && newest.getChunkID() === this.chat.getLatestChunk()) {
				this.securedData.setAfterRelationShip(newest.getSecuredData())
			}

			const signAndEncryptPromise = this.securedData._signAndEncrypt(userService.getOwn().getSignKey(), chunkKey)
			const keys = await this.uploadAttachments(chunkKey)
			const request = await signAndEncryptPromise

			const response = await socket.emit("chat.message.create", {
				chunkID: chunk.getID(),
				message: request,
				keys: keys.map(keyStore.upload.getKey)
			})

			if (response.success) {
				this.wasSent = true
				this.data.sent = true

				this.setAttachmentInfo("files")
				this.setAttachmentInfo("voicemails")
				this.setImagesInfo()
			}

			if (response.server) {
				this.sendTime = h.parseDecimal(response.server.sendTime)
				this.serverID = h.parseDecimal(response.server.id)
				this.chunkID = h.parseDecimal(response.server.chunkID)
				this.previousID = response.server.previousMessage
				this.data.timestamp = this.getTime()
			}

			return response.success
		}).catch(socket.errors.Disconnect, (e) => {
			console.warn(e)
			return false
		}).catch(socket.errors.Server, () => {
			return false
		})
	}

	getSecuredData = () => {
		return this.securedData
	}

	getServerID = () => {
		return this.serverID
	}

	getPreviousID = () => {
		return this.previousID
	}

	getClientID = () => {
		return this.clientID
	}

	getTopicID = () => {
		return this.chunkID
	}

	getTime = () => {
		if (this.getServerID()) {
			return this.sendTime
		}

		return h.parseDecimal(this.securedData.metaAttr("createTime"))
	}

	isOwn = () => {
		return this.isOwnMessage
	}

	verifyParent = (chunk) => {
		this.securedData.checkParent(chunk.getSecuredData())
	}

	getText = () => {
		return this.data.text
	}

	private setAttachmentInfo = (attr) => {
		const fullContent = this.securedData.contentGet()

		if (typeof fullContent === "string") {
			return
		}

		const content = fullContent[attr]
		const meta = this.securedData.metaAttr(attr)

		if (!content) {
			return
		}

		this.data[attr] = content.map((file, index) => ({
			...file,
			...meta[index],
			loaded: false
		}))

		Bluebird.resolve(this.data[attr]).filter((ele: any) => {
			return blobService.isBlobLoaded(ele.blobID)
		}).each((loadedAttachment: any) => {
			loadedAttachment.loaded = true
		})
	}

	downloadVoicemail = (voicemailDownloadProgress: Progress) => {
		return Bluebird.resolve(this.data.voicemails).each((voicemail: any) => {
			const progress = new Progress()

			voicemailDownloadProgress.addDepend(progress)

			return blobService.getBlobUrl(voicemail.blobID, voicemailDownloadProgress, voicemail.size).then((url) => {
				voicemail.url = url
				voicemail.loaded = true
			})
		})
	}

	private setImagesInfo = () => {
		const content = this.securedData.contentGet()

		const imagesMeta = this.securedData.metaAttr("images") || []

		if (typeof content === "string") {
			this.data.images = imagesMeta

			return
		}

		const imagesContent = content.images

		this.data.images = imagesMeta.map((imageMeta, index) => {
			const imageContent = imagesContent[index]

			const data =  h.objectMap(imageMeta, (val, key) => {
				return {
					...val,
					...imageContent[key]
				}
			})

			return data
		})
	}

	static createRawSecuredData(message, meta, chunk?: Chunk) {
		const secured = SecuredData.createRaw({ message }, meta, {
			type: "message",
		})

		if (chunk) {
			secured.setParent(chunk.getSecuredData())
		}

		return secured
	}



	static idFromData(server) {
		const serverID = h.parseDecimal(server.id)
		const clientID = server.uuid

		return {
			serverID,
			clientID
		}
	}
}

type MessageCache = {
	content: any,
	meta: any,
	server: any
}

const loadMessageSender = senderID =>
	userService.get(senderID)
		.then(sender => sender.loadBasicData().thenReturn(sender))

export default class MessageLoader extends ObjectLoader<Message, MessageCache>({
	cacheName: "message",
	getID: ({ server }) => server.uuid,
	download: id => socket.emit("chat.message.get", { id }),
	load: (messageResponse): Bluebird<MessageCache> => {
		const { content, meta, server } = messageResponse

		const securedData = SecuredData.load(content, meta, { type: "message" })
		const senderID = server.sender

		// !! Typescript is broken for async arrow functions without a this context !!
		return Bluebird.try<MessageCache>(async function () {
			const sender = await loadMessageSender(senderID)

			await Bluebird.all([
				securedData.decrypt(),
				securedData.verify(sender.getSignKey())
			])

			return {
				content: securedData.contentGet(),
				meta: securedData.metaGet(),
				server: messageResponse.server,
			}
		})
	},
	restore: (messageInfo: MessageCache) =>
		loadMessageSender(messageInfo.server.sender)
			.then((sender) => new Message({ ...messageInfo, sender })),
}) {}
