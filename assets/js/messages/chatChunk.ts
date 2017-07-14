import h from "../helper/helper";
const validator = require("validation/validator");
import Observer from "../asset/observer"
const SecuredData = require("asset/securedDataWithMetaData");
import * as Bluebird from "bluebird"
const debug = require("debug");

const userService = require("user/userService");
import socket from "../services/socket.service"
import ObjectLoader from "../services/objectLoader"
const keyStore = require("services/keyStore.service").default;
const sessionService = require("services/session.service").default;

import { Message } from "./message"

const debugName = "whispeer:chunk";
const chunkDebug = debug(debugName);

declare const startup: number

export class Chunk extends Observer {
	private securedData
	private receiver
	private id
	private createTime
	private successorID: number
	private predecessorID: number
	private receiverObjects: any[]
	private chatID: number
	private title: string = ""
	private admins: number[]

	constructor(data) {
		super()

		var err = validator.validate("topic", data.meta);
		if (err) {
			throw err;
		}

		data.meta.receiver.sort();

		this.securedData = SecuredData.load(data.content, data.meta, {
			type: "topic", // Keep topic for now until lots of clients have picked up the change
			alternativeType: "chatChunk" // Allow for chatChunk already
		});

		this.id = data.server.id
		this.chatID = data.server.chatID
		this.predecessorID = data.server.predecessorID
		this.createTime = data.server.createTime

		this.receiver = this.securedData.metaAttr("receiver").map(h.parseDecimal);

		const metaAdmins = this.securedData.metaAttr("admins")
		const creator = this.securedData.metaAttr("creator")

		this.admins = (metaAdmins ? metaAdmins : [creator]).map(h.parseDecimal)
	}

	awaitEarlierSend = (time) => {
		/*
		var previousMessages = this.getNotSentMessages().filter((message) => {
			return message.getTime() < time;
		});

		if (previousMessages.length === 0) {
			return Bluebird.resolve();
		}

		return previousMessages[previousMessages.length - 1].sendContinously();
		*/
	}

	getChatID = () => this.chatID

	getSecuredData = () => {
		return this.securedData;
	}

	getHash = () => {
		return this.securedData.getHash();
	}

	getID = () => {
		return h.parseDecimal(this.id);
	};

	getTime = () => {
		if (this.createTime) {
			return this.createTime
		}

		return this.getSecuredData().metaAttr("createTime");
	};

	getKey = () => {
		return this.securedData.metaAttr("_key");
	};

	ensureChunkChain = (predecessor) => {
		if (this.getID() === predecessor.getID()) {
			return
		}

		var predecessorID = this.getPredecessorID()

		if (!predecessorID || !ChunkLoader.isLoaded(predecessorID)) {
			throw new Error(`Chunk chain broken ${predecessorID}`)
		}

		const predecessorChunk = ChunkLoader.getLoaded(predecessorID)

		predecessorChunk.verifyParent(this)

		predecessorChunk.ensureChunkChain(predecessor)
	}

	verifyParent = (chunk: Chunk) => {
		chunk.getSecuredData().checkParent(this.getSecuredData())
	}

	verify = () => {
		return Bluebird.try(() => {
			return userService.get(this.securedData.metaAttr("creator"));
		}).then((creator) => {
			if (creator.isNotExistingUser()) {
				// TODO this.data.disabled = true;
				return false;
			}

			return this.securedData.verify(creator.getSignKey()).thenReturn(true);
		}).then((addEncryptionIdentifier) => {
			if (addEncryptionIdentifier) {
				keyStore.security.addEncryptionIdentifier(this.securedData.metaAttr("_key"));
			}
		})
	};

	loadReceiverNames = h.cacheResult<Bluebird<any>>(() => {
		return Bluebird.try(() => {
			return userService.getMultipleFormatted(this.receiver)
		}).then((receiverObjects) => {
			this.receiverObjects = receiverObjects
		})
	});

	getReceivers = () => {
		return this.receiverObjects
	}

	getPartners = () => {
		return this.receiverObjects.filter((receiverObject) => {
			return !receiverObject.user.isOwn() || this.receiverObjects.length === 1
		});
	}

	getPartnerDisplay = (maxDisplay = 3) => {
		const partners = this.getPartners()

		if (partners.length <= maxDisplay) {
			return partners
		}

		return partners.slice(0, maxDisplay - 1)
	}

	getReceiver = () => {
		return this.receiver
	}

	getAdmins = () => {
		return this.admins
	}

	getReceiverIDs = () => {
		return this.receiver
	}

	decryptContent = () => {
		if (!this.securedData.hasContent()) {
			this.title = ""
			return
		}

		return this.securedData.decrypt().then((content) => {
			this.title = content.title
		})
	}

	getTitle = () => {
		return this.title
	}

	load = () => {
		return Bluebird.all([
			this.verify(),
			this.loadReceiverNames(),
			this.decryptContent(),
		]).then(() => {
			var predecessorID = this.getPredecessorID()

			if (predecessorID && ChunkLoader.isLoaded(predecessorID)) {
				ChunkLoader.getLoaded(predecessorID).setSuccessor(this.getID())
			}
		}).finally(() => {
			chunkDebug(`Chunk loaded (${this.getID()}):${new Date().getTime() - startup}`);
		})
	};

	isAdmin = (user) => {
		return this.getAdmins().indexOf(user.getID()) > -1
	}

	amIAdmin = () => {
		return this.isAdmin(userService.getown())
	}

	getCreator = () => {
		return h.parseDecimal(this.securedData.metaAttr("creator"))
	}

	hasPredecessor = () => {
		return !!this.predecessorID
	}

	getPredecessorID = () => {
		if (!this.hasPredecessor()) {
			return null
		}

		return h.parseDecimal(this.predecessorID)
	}

	getPredecessor = () => {
		if (!this.hasPredecessor()) {
			return Bluebird.resolve(null)
		}

		return ChunkLoader.get(this.getPredecessorID()).catch((err) => {
			console.log(err)
			return null
		}, socket.errors.Server)
	}

	setSuccessor = (successorID) => {
		this.successorID = successorID

		console.warn("Set successor of chunk " , this.getID(), " succ: ", successorID)

		this.notify({ successorID: successorID }, "successor")
	}

	hasKnownSuccessor = () => {
		return !!this.successorID
	}

	getLoadedSuccessor = () => {
		if (!this.hasKnownSuccessor()) {
			return
		}

		return ChunkLoader.getLoaded(this.successorID)
	}

	getSuccessor = () => {
		if (this.successorID) {
			return ChunkLoader.get(this.successorID)
		}

		return socket.emit("chat.chunk.successor", { id: this.getID() }).then((response) => {
			if (!response.chunk) {
				return
			}

			return ChunkLoader.load(response.chunk).then((successorChunk) => {
				if (successorChunk.getPredecessorID() !== this.getID()) {
					throw new Error("server returned invalid successor chunk")
				}

				return successorChunk
			})
		})
	}

	static loadChunkChain(newChunk, oldChunk) {
		if (newChunk.getID() === oldChunk.getID()) {
			return Bluebird.resolve()
		}

		if (newChunk.getPredecessorID() === oldChunk.getID()) {
			return Bluebird.resolve()
		}

		return newChunk.getPredecessor().then((pred) => {
			if (!pred) {
				return
			}

			if (pred.getID() === oldChunk.getID()) {
				return
			}

			return Chunk.loadChunkChain(pred, oldChunk)
		})
	}

	private static createChunkKey = () => {
		return keyStore.sym.generateKey(null, "chunkMain").then((chunkKey) => {
			return keyStore.sym.symEncryptKey(chunkKey, userService.getown().getMainKey()).thenReturn(chunkKey)
		})
	}

	static createRawData(receiver, { content = {}, meta = {}, predecessorChunk } : { content: any, meta?: any, predecessorChunk?: Chunk}) {
		return Bluebird.try(async () => {
			const receiverKeys = {}

			const receiverIDs = receiver.map((val) => {
				if (typeof val === "object") {
					return val.getID();
				} else {
					return h.parseDecimal(val);
				}
			});

			const receiverObjects = await userService.getMultiple(receiverIDs);

			const chunkKey = await Chunk.createChunkKey()

			const receiverObjectsExceptOwn = receiverObjects.filter((receiver) => !receiver.isOwn())

			const cryptKeys = await Bluebird.all(receiverObjectsExceptOwn.map((receiverObject) => {
				var crypt = receiverObject.getCryptKey();
				return keyStore.sym.asymEncryptKey(chunkKey, crypt);
			}));

			var cryptKeysData = keyStore.upload.getKeys(cryptKeys);

			receiverObjectsExceptOwn.forEach((receiver, index) => {
				receiverKeys[receiver.getID()] = cryptKeys[index];
			});

			receiverIDs.sort();

			var chunkMeta = {
				...meta,
				createTime: new Date().getTime(),
				receiver: receiverIDs,
				creator: userService.getown().getID(),
			}

			var secured = SecuredData.createRaw(content, chunkMeta, { type: "topic" })

			if (predecessorChunk) {
				secured.setParent(predecessorChunk.getSecuredData())
			}

			const cData = await secured.signAndEncrypt(userService.getown().getSignKey(), chunkKey)

			return {
				keys: cryptKeysData.concat([keyStore.upload.getKey(chunkKey)]),
				receiverKeys: receiverKeys,
				chunk: cData,
			}
		})

		var receiverObjects, chunkKey;
		return Bluebird.try(() => {
			//load receiver
			receiver = receiver.map((val) => {
				if (typeof val === "object") {
					return val.getID();
				} else {
					return h.parseDecimal(val);
				}
			});

			h.removeArray(receiver, sessionService.getUserID());

			//get receiver objects
			return userService.getMultiple(receiver);
		}).then((receiverO) => {
			receiverObjects = receiverO;

			return Chunk.createChunkKey()
		}).then((key) => {
			chunkKey = key

			//encrypt chunk key for receiver
			return Bluebird.all(receiverObjects.map((receiverObject) => {
				var crypt = receiverObject.getCryptKey();
				return keyStore.sym.asymEncryptKey(chunkKey, crypt);
			}));
		}).then((cryptKeys) => {
			var cryptKeysData = keyStore.upload.getKeys(cryptKeys);
			var receiverKeys = {}, receiverIDs = [];

			receiverObjects.forEach((receiver, index) => {
				receiverIDs.push(receiver.getID());
				receiverKeys[receiver.getID()] = cryptKeys[index];
			});

			receiverIDs.push(userService.getown().getID());
			receiverIDs.sort();

			// chunk signable data.
			var chunkMeta = {
				createTime: new Date().getTime(),
				receiver: receiverIDs,
				creator: userService.getown().getID(),
				// TODO: previousChunk admins or me if new chunk // admins: []
			}

			var secured = SecuredData.createRaw(content, chunkMeta, { type: "topic" })

			if (predecessorChunk) {
				secured.setParent(predecessorChunk.getSecuredData())
			}

			return secured.signAndEncrypt(userService.getown().getSignKey(), chunkKey).then((cData) => {
				return {
					keys: cryptKeysData.concat([keyStore.upload.getKey(chunkKey)]),
					receiverKeys: receiverKeys,
					chunk: cData,
				}
			})
		})
	};

	static createData(receiver, message, images) {
		var imagePreparation = Bluebird.resolve(images).map((image: any) => {
			return image.prepare()
		})

		const uploadImages = (chunkKey) => {
			return Bluebird.all(images.map((image) => {
				return image.upload(chunkKey)
			}))
		}

		return Bluebird.all([Chunk.createRawData(receiver, { content: {} }), imagePreparation]).spread((chunkData: any, imagesMeta) => {
			var chunk = new Chunk({
				meta: chunkData.chunk.meta,
				content: chunkData.chunk.content,
				server: {},
				unread: []
			});

			var messageMeta = {
				createTime: new Date().getTime(),
				images: imagesMeta
			};

			return Bluebird.all([
				chunkData,
				Message.createRawData(message, messageMeta, chunk),
				uploadImages(chunk.getKey())
			]);
		}).spread((chunkData, messageData, imageKeys: any) => {
			imageKeys = h.array.flatten(imageKeys);
			messageData.imageKeys = imageKeys.map(keyStore.upload.getKey);

			chunkData.message = messageData;

			return chunkData;
		})
	};
}

Observer.extend(Chunk);

const loadHook = (chunkResponse) => {
	const chunk = new Chunk(chunkResponse)

	return chunk.load().thenReturn(chunk)
}

const downloadHook = (id) => {
	return socket.emit("chat.chunk.get", { id })
}

const idHook = (response) => response.server.id

const hooks = {
	downloadHook, loadHook, idHook
}

export default class ChunkLoader extends ObjectLoader(hooks) {}
