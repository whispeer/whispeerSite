/**
* MessageService
**/
define(["step", "whispeerHelper", "valid/validator"], function (step, h, validator) {
	"use strict";

	var service = function ($rootScope, socket, sessionService, userService, keyStore) {
		var messages = {};
		var topics = {};

		var topicArray = [];

		var Message = function (data) {
			var theMessage = this;

			var meta = data.meta;
			var content = data.content;

			this.text = ""; //To-do localize
			this.timestamp = meta.sendTime;

			this.loading = true;
			this.loaded = false;

			this.sender = {
				"id": meta.sender,
				"name": "",
				"image": "img/profil.jpg"
			};

			var decrypted = false;
			var decryptedText;

			var err = validator.validate("message", data);
			if (err) {
				throw err;
			}

			if (typeof content.key === "object") {
				content.key = keyStore.upload.addKey(content.key);
			}

			this.getHash = function getHashF() {
				return meta.ownHash;
			};

			this.getTopicHash = function getHashF() {
				return meta.topicHash;
			};

			this.getID = function getIDF() {
				return meta.messageid;
			};

			this.getTopicID = function getTopicIDF() {
				return meta.topicid;
			};

			this.getTime = function getTimeF() {
				return meta.sendTime;
			};

			this.loadSender = function loadSenderF(cb) {
				step(function () {
					userService.get(meta.sender, this);
				}, h.sF(function loadS1(sender) {
					this.parallel.unflatten();

					this.parallel()(null, sender.isOwn());

					sender.getName(this.parallel());
					sender.getImage(this.parallel());
				}), h.sF(function loadS2(ownUser, name, image) {
					theMessage.sender = {
						me: ownUser,
						other: !ownUser,
						id: meta.sender,
						name: name,
						image: image
					};

					this.ne();
				}), cb);
			};

			this.loadFullData = function loadFullDataF(cb) {
				step(function () {
					theMessage.decrypt(this.parallel());
					theMessage.loadSender(this.parallel());
				}, h.sF(function () {
					this.ne();
				}), cb);
			};

			this.decrypt = function decryptF(cb) {
				step(function () {
					if (decrypted) {
						this.last.ne();
					} else {
						keyStore.sym.decrypt({
							ct: content.text,
							iv: content.iv
						}, content.key, this);
					}
				}, h.sF(function (text) {
					decrypted = true;
					decryptedText = text;

					var randomPart = text.indexOf("::");

					theMessage.text = text.substr(randomPart + 2);

					this.ne(text);
				}), cb);
			};
		};

		var Topic = function (data) {
			var messages = [], theTopic = this, receiverObjects;

			var err = validator.validate("topic", data);
			if (err) {
				throw err;
			}

			if (typeof data.key === "object") {
				data.key = keyStore.upload.addKey(data.key);
			}

			this.messages = messages;

			this.partners = [];
			this.partnersDisplay = [];

			this.remainingUser = "";
			this.remainingUserTitle = "";

			this.id = data.topicid;
			this.type = (data.receiver.length === 2 ? "peerChat" : "groupChat");

			this.getOldestID = function getOldestIDF() {
				if (this.messages.length === 0) {
					return 0;
				} else {
					return this.messages[0].getID();
				}
			};

			this.getHash = function getHashF() {
				return data.topicHash;
			};

			this.getID = function getIDF() {
				return data.topicid;
			};

			this.getTime = function getTimeF() {
				return data.time;
			};

			this.getKey = function getKeyF() {
				return data.key;
			};

			this.addMessage = function addMessageF(m, cb) {
				step(function () {
					if (m.getTime() > data.time) {
						data.time = m.getTime();
					}

					m.loadFullData(this);
				}, h.sF(function () {
					//add to message list
					messages.push(m);
					messages.sort(function (a, b) {
						return (a.getTime() - b.getTime());
					});

					theTopic.latestMessage = messages[messages.length - 1];

					if (cb) {
						this.ne();
					}
				}), cb);
			};

			this.decryptMessages = function decryptMessagesF(cb) {
				step(function () {
					var i;
					for (i = 0; i < messages.length; i += 1) {
						messages[i].loadFullData(this.parallel());
					}

					this.parallel()();
				}, h.sF(function () {
					this.ne();
				}), cb);
			};

			this.loadReceiverNames = function loadRNF(cb) {
				step(function () {
					if (receiverObjects) {
						this.ne(receiverObjects);
					} else {
						userService.getMultiple(data.receiver, this);
					}
				}, h.sF(function (receiverO) {
					receiverObjects = receiverO;
					var i;
					for (i = 0; i < receiverObjects.length; i += 1) {
						receiverObjects[i].getShortName(this.parallel());
						receiverObjects[i].getName(this.parallel());
						receiverObjects[i].getImage(this.parallel());
					}
				}), h.sF(function (data) {
					var partners = theTopic.partners;
					var i, userData, me;
					for (i = 0; i < receiverObjects.length; i += 1) {
						userData = {
							"id": receiverObjects[i].getID(),
							"url": receiverObjects[i].getUrl(),
							"shortname": data[i*3],
							"name": data[i*3+1],
							"image": data[i*3+2]
						};

						if (!receiverObjects[i].isOwn()) {
							partners.push(userData);
						} else {
							me = userData;
						}
					}

					if (partners.length > 4) {
						theTopic.partnersDisplay = partners.slice(0, 3);
						theTopic.remainingUser = partners.length - 3;
						for (i = 3; i < partners.length; i += 1) {
							theTopic.remainingUserTitle += partners[i].name;
							if (i < partners.length - 1) {
								theTopic.remainingUserTitle += ", ";
							}
						}
					} else {
						theTopic.partnersDisplay = partners.slice(0, 4);
						if (theTopic.partnersDisplay.length < 4 && theTopic.partnersDisplay.length > 1) {
							theTopic.partnersDisplay.push(me);
						}
					}

					//partners.push(me);

					this.ne();
				}), cb);
			};

			this.loadAllData = function loadAllDataF(cb) {
				step(function () {
					theTopic.loadNewest(this);
				}, h.sF(function () {
					theTopic.decryptMessages(this.parallel());
					theTopic.loadReceiverNames(this.parallel());
				}), cb);
			};

			this.loadMoreMessages = function loadMoreMessagesF(cb) {
				step(function () {
					socket.emit("messages.getTopicMessages", {
						topicid: theTopic.getID(),
						afterMessage: theTopic.getOldestID()
					}, this);
				}, h.sF(function (data) {
					if (data.messages) {
						var i;
						for (i = 0; i < data.messages.length; i += 1) {
							makeMessage(data.messages[i], this.parallel());
						}
					}

					this.parallel()();
				}), h.sF(function () {
					console.log("Messages loaded: " + (new Date().getTime() - startup));
					this.ne();
				}), cb);
				//load more messages and decrypt them.
			};

			this.loadNewest = function loadNewestF(cb) {
				step(function () {
					if (data.newest) {
						makeMessage(data.newest, this);
					} else {
						this.ne();
					}
				}, cb);
			};
		};

		Message.createData = function (topic, message, cb) {
			step(function () {
				if (typeof topic !== "object") {
					Topic.get(topic, this);
				} else {
					this.ne(topic);
				}
			}, h.sF(function (rTopic) {
				topic = rTopic;

				var random = keyStore.random.hex(20);

				message = random + "::" + message;

				var newest = topic.latestMessage;

				var meta = {
					createTime: new Date().getTime(),
					topicHash: newest.getTopicHash(),
					previousMessage: newest.getID(),
					previousMessageHash: newest.getHash()
				};

				var topicKey = topic.getKey();

				Message.createRawData(topicKey, message, meta, this);
			}), h.sF(function (mData) {

				mData.meta.topicid = topic.getID();

				var result = {
					message: mData
				};

				this.ne(result);
			}), cb);
		};

		Message.createRawData = function (topicKey, message, meta, cb) {
			var mKey, mData, encryptedMessageData;
			step(function () {
				keyStore.sym.generateKey(this);
			}, h.sF(function (key) {
				mKey = key;

				this.parallel.unflatten();

				keyStore.sym.encrypt(message, key, this.parallel());
				keyStore.sym.symEncryptKey(key, topicKey, this.parallel());
			}), h.sF(function (encr) {
				var unEncryptedMessageData = {
					meta: meta,
					content: message
				};

				encryptedMessageData = {
					meta: meta,
					content: {
						iv: encr.iv,
						text: encr.ct
					}
				};

				this.parallel.unflatten();

				meta.ownHash = keyStore.hash.hashObject(encryptedMessageData);

				keyStore.sign.signObject(encryptedMessageData, userService.getown().getSignKey(), this.parallel());
				keyStore.sign.signObject(unEncryptedMessageData, userService.getown().getSignKey(), this.parallel());
			}), h.sF(function (encrSignature, unEncrSignature) {
				mData = encryptedMessageData;
				mData.meta.signature = unEncrSignature;
				mData.meta.encrSignature = encrSignature;

				mData.content.key = keyStore.upload.getKey(mKey);

				this.ne(mData);
			}), cb);
		};

		Topic.get = function (topicid, cb) {
			step(function () {
				if (topics[topicid]) {
					this.last.ne(topics[topicid]);
				} else {
					throw "not implemented";
				}
			}, cb);
		};

		Topic.createData = function (receiver, message, cb) {
			var receiverObjects, topicKey, result, topicHash;
			step(function () {
				//load receiver
				receiver = receiver.map(function (val) {
					if (typeof val === "object") {
						return val.getID();
					} else {
						return parseInt(val, 10);
					}
				});

				if (receiver.indexOf(sessionService.getUserID()) === -1) {
					receiver.push(sessionService.getUserID());
				}

				//get receiver objects
				userService.getMultiple(receiver, this);
			}, h.sF(function (receiverO) {
				receiverObjects = receiverO;

				//generate topic key
				keyStore.sym.generateKey(this);
			}), h.sF(function (key) {
				topicKey = key;

				//encrypt topic key with own mainkey
				keyStore.sym.symEncryptKey(topicKey, userService.getown().getMainKey(), this);
			}), h.sF(function () {
				//encrypt topic key for receiver
				var i, crypt;
				for (i = 0; i < receiverObjects.length; i += 1) {
					if (!receiverObjects[i].isOwn()) {
						crypt = receiverObjects[i].getCryptKey();
						keyStore.sym.asymEncryptKey(topicKey, crypt, this.parallel());
					}
				}
			}), h.sF(function (cryptKeys) {
				var cryptKeysData = keyStore.upload.getKeys(cryptKeys);
				var topicKeyData = keyStore.upload.getKey(topicKey);

				//create data
				result = {
					topic: {
						createTime: new Date().getTime(),
						key: topicKeyData,
						receiver: receiver,
						cryptKeys: cryptKeysData
					}
				};

				// topic hashable data.
				var topicHashData = {
					createTime: result.topic.createTime,
					key: topicKey,
					receiver: receiver
				};

				topicHash = keyStore.hash.hashObject(topicHashData);

				var random = keyStore.random.hex(20);

				message = random + "::" + message;

				var meta = {
					createTime: new Date().getTime(),
					topicHash: topicHash,
					previousMessage: 0,
					previousMessageHash: "0"
				};

				Message.createRawData(topicKey, message, meta, this);
			}), h.sF(function (mData) {
				result.message = mData;

				this.ne(result);
			}), cb);
		};

		function makeTopic(data, cb) {
			var t = new Topic(data);

			var id = t.getID();

			if (topics[id]) {
				return topics[id];
			}

			topics[id] = t;

			step(function () {
				t.loadAllData(this);
			}, h.sF(function () {
				//add to topic list
				topicArray.push(t);
				topicArray.sort(function (a, b) {
					return (b.getTime() - a.getTime());
				});

				console.log("Topic loaded:" + (new Date().getTime() - startup));

				if (cb) {
					this.ne();
				}
			}), cb);

			return t;
		}

		function makeMessage(data, cb) {
			var m = new Message(data);

			var id = m.getID();

			if (messages[id]) {
				return messages[id];
			}

			messages[id] = m;

			if (topics[m.getTopicID()]) {
				topics[m.getTopicID()].addMessage(m, cb);
			}

			return m;
		}

		socket.listen("message", function (e, data) {
			if (!e) {
				if (data.topic) {
					makeTopic(data.topic);
				}

				if (data.message) {
					makeMessage(data.message);
				}
			} else {
				console.error(e);
			}
		});

		var messageService = {
			reset: function () {
				messages = {};
				topics = {};
				topicArray = [];
				messageService.data = {
					latestTopics: {
						count: 0,
						loading: false,
						loaded: false,
						data: topicArray
					},
					unread: 0
				};
			},
			loadMoreLatest: function (cb) {
				var l = messageService.data.latestTopics;
				step(function () {
					l.loading = true;

					var last;
					if (topicArray.length > 0) {
						last = topicArray[topicArray.length - 1].getID();
					} else {
						last = 0;
					}

					socket.emit("messages.getTopics", {
						afterTopic: last
					}, this);
				}, h.sF(function (latest) {
					l.loaded = true;
					l.loading = false;

					var i;
					for (i = 0; i < latest.topics.length; i += 1) {
						makeTopic(latest.topics[i], this.parallel());
					}
				}), cb);
			},
			getTopic: function (topicid, cb) {
				step(function () {
					if (topics[topicid]) {
						this.last.ne(topics[topicid]);
					} else {
						//TODO
					}
				}, cb);
			},
			sendNewTopic: function (receiver, message) {
				step(function () {
					Topic.createData(receiver, message, this);
				}, h.sF(function (result) {
					socket.emit("messages.sendNewTopic", result, this);
				}), function (e, result) {
					if (e || result.error) {
						//TO-DO: try resending!
						debugger;
					} else {
						makeTopic(result.topic);
					}
				});
			},
			sendMessage: function (topic, message, cb) {
				step(function () {
					Message.createData(topic, message, this);
				}, h.sF(function (result) {
					socket.emit("messages.send", result, this);
				}), h.sF(function (result) {
					makeMessage(result.message);
					this.ne();
				}), cb);
			},
			data: {
				latestTopics: {
					count: 0,
					loading: false,
					loaded: false,
					data: topicArray
				},
				unread: 0
			}
		};

		$rootScope.$on("ssn.ownLoaded", function (evt, data) {
			messageService.data.unread = data.messages.getUnreadCount.unread;
		});

		$rootScope.$on("ssn.reset", function () {
			messageService.reset();
		});

		return messageService;
	};

	service.$inject = ["$rootScope", "ssn.socketService", "ssn.sessionService", "ssn.userService", "ssn.keyStoreService"];

	return service;
});