import * as Bluebird from "bluebird"
import h from "../helper/helper"

var userService = require("user/userService");
var socket = require("services/socket.service").default;
var keyStore = require("services/keyStore.service").default;

var SecuredData = require("asset/securedDataWithMetaData");
import ObjectLoader from "../services/objectLoader"

import ChunkLoader, { Chunk } from "./chatChunk"
import { Chat } from "./chat"

export class Message {
	private _hasBeenSent: boolean
	private _isDecrypted: boolean
	private _isOwnMessage: boolean

	private _serverID: number
	private _clientID: any
	private _securedData: any
	private _images: any[]

	private sendTime: number
	private senderID: number

	private data: any

	private chunkID: number

	private chat: Chat

	constructor(messageData, chat?: Chat, images?, id?) {
		if (!chat) {
			this.fromSecuredData(messageData);
			return
		}

		this.fromDecryptedData(chat, messageData, images, id);
	}

	fromSecuredData = (data) => {
		const { meta, content, server } = data

		this._hasBeenSent = true;
		this._isDecrypted = false;

		var id = Message.idFromData(data)

		this.chunkID = server.chunkID

		this.sendTime = h.parseDecimal(server.sendTime)
		this.senderID = h.parseDecimal(server.sender)

		this._serverID = id.serverID
		this._clientID = id.clientID

		var metaCopy = h.deepCopyObj(meta);
		this._securedData = SecuredData.load(content, metaCopy, {
			type: "message"
		});

		this.setData();
	};

	fromDecryptedData = (chat: Chat, message, images, id) => {
		this._hasBeenSent = false;
		this._isDecrypted = true;
		this._isOwnMessage = true;

		this.chat = chat;
		this._images = images;

		this._clientID = id || h.generateUUID();

		this.senderID = h.parseDecimal(userService.getown().getID())

		var meta = {
			createTime: new Date().getTime(),
			messageUUID: this._clientID
		};

		this._securedData = Message.createRawSecuredData(message, meta);

		this.setData();

		this.data.text = message;
		this.data.images = images.map((image) => {
			if (!image.convertForGallery) {
				return image;
			}

			return image.convertForGallery();
		});

		this.loadSender();
		this._prepareImages();
	};

	_prepareImages = h.cacheResult<Bluebird<any>>(() => {
		return Bluebird.resolve(this._images).map((image: any) => {
			return image.prepare();
		});
	})

	setData = () => {
		this.data = {
			text: "",
			timestamp: this.getTime(),
			date: new Date(this.getTime()),

			loading: true,
			loaded: false,
			sent: this._hasBeenSent,

			sender: {
				"id": this.senderID,
				"name": "",
				"url": "",
				"image": "assets/img/user.png"
			},

			images: this._securedData.metaAttr("images"),

			id: this._clientID,
			obj: this
		};
	};

	getChunkID = () => {
		return this.chunkID || this.chat.getLatestChunk()
	}

	hasBeenSent = () => {
		return this._hasBeenSent;
	};

	uploadImages = h.cacheResult<Bluebird<any>>((chunkKey) => {
		return this._prepareImages().then(() => {
			return Bluebird.all(this._images.map((image) => {
				return image.upload(chunkKey);
			}));
		}).then((imageKeys) => {
			return h.array.flatten(imageKeys);
		});
	})

	sendContinously = h.cacheResult<any>(() => {
		return h.repeatUntilTrue(Bluebird, () => {
			return this.send();
		}, 2000);
	})

	send = () => {
		if (this._hasBeenSent) {
			throw new Error("trying to send an already sent message");
		}

		return Bluebird.try(async () => {
			await socket.awaitConnection()

			const chunk = await ChunkLoader.get(this.chat.getLatestChunk())

			this._securedData.setParent(chunk.getSecuredData());

			await chunk.awaitEarlierSend(this.getTime());

			const imagesMeta = await this._prepareImages()

			this._securedData.metaSetAttr("images", imagesMeta);

			const chunkKey = chunk.getKey();
			const newest = await MessageLoader.get(this.chat.getLatestMessage())

			if (newest && newest.getChunkID() === this.chat.getLatestChunk()) {
				this._securedData.setAfterRelationShip(newest.getSecuredData());
			}

			const signAndEncryptPromise = this._securedData._signAndEncrypt(userService.getown().getSignKey(), chunkKey);

			const imageKeys = await this.uploadImages(chunkKey)

			const request = await signAndEncryptPromise

			request.imageKeys = imageKeys.map(keyStore.upload.getKey);

			const response = await socket.emit("chat.message.create", {
				chunkID: chunk.getID(),
				message: request
			});

			if (response.success) {
				this._hasBeenSent = true;
				this.data.sent = true;
			}

			if (response.server) {
				this.sendTime = h.parseDecimal(response.server.sendTime)
				this._serverID = h.parseDecimal(response.server.id)
				this.data.timestamp = this.getTime();
			}

			return response.success;
		}).catch(socket.errors.Disconnect, (e) => {
			console.warn(e);
			return false;
		}).catch(socket.errors.Server, (e) => {
			return false
		});
	};

	getSecuredData = () => {
		return this._securedData;
	};

	getServerID = () => {
		return this._serverID;
	};

	getClientID = () => {
		return this._clientID;
	};

	getTopicID = () => {
		return this.chunkID
	}

	getTime = () => {
		if (this.getServerID()) {
			return this.sendTime;
		}

		return h.parseDecimal(this._securedData.metaAttr("createTime"));
	};

	isOwn = () => {
		return this._isOwnMessage;
	};

	loadSender = () => {
		return Bluebird.try(() => {
			return userService.get(this.senderID);
		}).then((sender) => {
			return sender.loadBasicData().thenReturn(sender);
		}).then((sender) => {
			this.data.sender = sender.data;
			this._isOwnMessage = sender.isOwn();

			return sender;
		});
	};

	load = () => {
		return this.loadSender().then((sender) => {
			return Bluebird.all([
				this.decrypt(),
				this.verify(sender.getSignKey())
			]);
		}).then(() => {
			return;
		})
	};

	verifyParent = (chunk) => {
		this._securedData.checkParent(chunk.getSecuredData())
	};

	verify = (signKey) => {
		if (!this._hasBeenSent) {
			throw new Error("verifying unsent message")
		}

		return this._securedData.verify(signKey)
	};

	getText = () => {
		return this.data.text
	}

	decrypt = () => {
		if (this._isDecrypted) {
			return Bluebird.resolve(this.data.text)
		}

		return Bluebird.try(() => {
			return this._securedData.decrypt();
		}).then(() => {
			this.data.text = this._securedData.contentGet();
			return this._securedData.contentGet();
		})
	}

	static createRawSecuredData(message, meta, chunk?: Chunk) {
		var secured = SecuredData.createRaw(message, meta, {
			type: "message",
		});

		if (chunk) {
			secured.setParent(chunk.getSecuredData())
		}

		return secured;
	};

	static createRawData(message, meta, chunk: Chunk) {
		var secured = Message.createRawSecuredData(message, meta, chunk);
		return secured._signAndEncrypt(userService.getown().getSignKey(), chunk.getKey());
	};

	static idFromData(data) {
		var serverID = h.parseDecimal(data.server.id)
		var clientID = data.server.uuid

		return {
			serverID,
			clientID
		}
	}
}

const loadHook = (messageResponse) => {
	const message = new Message(messageResponse)

	return message.load().thenReturn(message)
}

const downloadHook = (id) => {
	return socket.emit("chat.message.get", { id })
}

const idHook = (response) => {
	return response.server.uuid
}

const hooks = {
	downloadHook, loadHook, idHook
}

export default class MessageLoader extends ObjectLoader<Message>(hooks) {}
