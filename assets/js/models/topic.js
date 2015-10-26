/**
* Topic Model
**/
define([
	"step",
	"whispeerHelper",
	"validation/validator",
	"asset/observer",
	"asset/sortedSet",
	"asset/securedDataWithMetaData",
	"bluebird",
	"models/modelsModule",
], function (step, h, validator, Observer, sortedSet, SecuredData, Bluebird, modelsModule) {
	"use strict";

	function topicModel($timeout, windowService, socket, userService, keyStore, sessionService, Message) {
		function sortGetTime(a, b) {
			return (a.getTime() - b.getTime());
		}

		function sortObjGetTime(a, b) {
			return (a.obj.getTime() - b.obj.getTime());
		}

		function sortObjGetTimeInv(a, b) {
			return (b.obj.getTime() - a.obj.getTime());
		}

		var topics = {}, messagesByID = {};
		var topicArray = sortedSet(sortObjGetTimeInv);

		var Topic = function (data) {
			var messages = sortedSet(sortGetTime), dataMessages = sortedSet(sortObjGetTime), theTopic = this, loadInitial = true;

			var err = validator.validate("topic", data.meta);
			if (err) {
				throw err;
			}

			data.meta.receiver.sort();

			var meta = SecuredData.load(undefined, data.meta, {
				type: "topic",
				attributesNotVerified: ["newest", "topicid", "unread", "newestTime"]
			});

			var unreadMessages;

			function setUnread(newUnread) {
				if (unreadMessages) {
					if (newUnread.length === 0 && unreadMessages.length > 0) {
						console.log("decrease unread count, topicid: " + data.topicid);
						Topic.notify(data.topicid, "read");
					} else if (newUnread.length > 0 && unreadMessages.length === 0) {
						console.log("increase unread count, topicid: " + data.topicid);
						Topic.notify(data.topicid, "unread");
					}
				}

				unreadMessages = newUnread.map(h.parseDecimal);
				theTopic.data.unread = (unreadMessages.length > 0);

				messages.forEach(function (message) {
					message.unread = unreadMessages.indexOf(message.getID()) > -1;
				});
			}

			var receiver = meta.metaAttr("receiver");

			this.data = {
				remaining: 1,

				messages: dataMessages,

				partners: [],
				partnersDisplay: [],

				remainingUser: "",
				remainingUserTitle: "",

				newMessage: "",

				id: data.topicid,
				type: (receiver.length <= 2 ? "peerChat" : "groupChat"),
				obj: this
			};

			setUnread(data.unread);

			this.getSecuredData = function () {
				return meta;
			};

			this.messageUnread = function messageUnreadF(mid) {
				return unreadMessages.indexOf(mid) > -1;
			};

			this.getOldestID = function getOldestIDF() {
				if (messages.length === 0) {
					return 0;
				} else {
					return messages[0].getServerID();
				}
			};

			this.getHash = function getHashF() {
				return meta.getHash();
			};

			this.getID = function getIDF() {
				return h.parseDecimal(data.topicid);
			};

			this.getTime = function getTimeF() {
				return data.newestTime;
			};

			this.getKey = function getKeyF() {
				return meta.metaAttr("_key");
			};

			this.markRead = function markMessagesRead(cb) {
				if (!windowService.isVisible) {
					windowService.listenOnce(function () {
						theTopic.markRead(cb);
					}, "visible");
					return;
				}

				step(function () {
					if (messages.length > 0) {
						var messageTime = messages[messages.length - 1].getTime();

						socket.emit("messages.markRead", {
							topicid: theTopic.getID(),
							beforeTime: messageTime + 1
						}, this);
					}
				}, h.sF(function (data) {
					setUnread(data.unread);
					this.ne();
				}), cb);
			};

			function addMessagesToList(messagesToAdd) {
				messagesToAdd = messagesToAdd.filter(function (message) {
					return messages.indexOf(message) === -1;
				});

				messages.join(messagesToAdd);
				dataMessages.join(messagesToAdd.map(function (e) {
					return e.data;
				}));

				theTopic.data.latestMessage = messages[messages.length - 1];
			}

			this.getNewest = function () {
				var sentMessages = messages.filter(function (m) {
					return m.hasBeenSent();
				});
				return sentMessages[sentMessages.length - 1];
			};

			this.sendMessage = function (message, images) {
				var messageObject = new Message(this, message, images);
				messagesByID[messageObject.getID()] = messageObject;
				this.addMessage(messageObject);

				messageObject.sendContinously();
			};

			this.addMessages = function (messages, addUnread) {
				messages.forEach(function (message) {
					var id = message.getID();
					data.newestTime = Math.max(message.getTime(), data.newestTime);

					message.verifyParent(theTopic);

					if (addUnread && !theTopic.messageUnread(id) && !message.isOwn()) {
						setUnread(unreadMessages.concat([id]));
					}

					message.unread = theTopic.messageUnread(id);
				});

				addMessagesToList(messages);

				theTopic.notify(messages, "addMessages");

				topicArray.resort();
			};

			this.addMessage = function addMessageF(message, addUnread) {
				this.addMessages([message], addUnread);
			};

			this.verify = function verify(cb) {
				step(function () {
					userService.get(meta.metaAttr("creator"), this);
				}, h.sF(function (creator) {
					if (creator.isNotExistingUser()) {
						theTopic.data.disabled = true;
						this.last.ne();
						return;
					}

					meta.verify(creator.getSignKey(), this);
				}), h.sF(function () {
					keyStore.security.addEncryptionIdentifier(meta.metaAttr("_key"));
					this.ne();
				}), cb);
			};

			this.loadReceiverNames = function loadRNF(cb) {
				step(function () {
					userService.getMultipleFormatted(receiver, this);
				}, h.sF(function (receiverObjects) {
					var partners = theTopic.data.partners;
					var i, me;
					for (i = 0; i < receiverObjects.length; i += 1) {
						if (!receiverObjects[i].user.isOwn() || receiverObjects.length === 1) {
							partners.push(receiverObjects[i]);
						} else {
							me = receiverObjects[i];
						}
					}

					theTopic.data.partnersDisplay = partners.slice(0, 2);
					if (partners.length > 2) {
						theTopic.data.remainingUser = partners.length - 2;
						for (i = 2; i < partners.length; i += 1) {
							theTopic.data.remainingUserTitle += partners[i].name;
							if (i < partners.length - 1) {
								theTopic.data.remainingUserTitle += ", ";
							}
						}
					}
					this.ne();
				}), cb);
			};

			this.getReceiver = function () {
				return receiver;
			};

			this.loadAllData = function loadAllDataF(cb) {
				step(function () {
					theTopic.verify(this);
				}, h.sF(function () {
					theTopic.loadReceiverNames(this);
				}), h.sF(function () {
					theTopic.loadNewest(this);
				}), cb);
			};

			this.loadInitialMessages = function loadInitialMessages(cb) {
				if (loadInitial) {
					theTopic.loadMoreMessages(cb, 19);
					loadInitial = false;
				} else {
					cb();
				}
			};

			this.loadMoreMessages = function loadMoreMessagesF(cb, max) {
				var loadMore = new Date().getTime();
				var remaining = 0;
				step(function () {
					if (theTopic.data.remaining > 0) {
						socket.emit("messages.getTopicMessages", {
							topicid: theTopic.getID(),
							afterMessage: theTopic.getOldestID(),
							maximum: max
						}, this);
					} else {
						this.last.ne();
					}
				}, h.sF(function (data) {
					console.log("Message server took: " + (new Date().getTime() - loadMore));

					remaining = data.remaining;

					if (data.messages && data.messages.length > 0) {
						data.messages.forEach(function (messageData) {
							Topic.messageFromData(messageData, this.parallel());
						}, this);
					} else {
						this.ne([]);
					}
				}), h.sF(function (messages) {
					theTopic.addMessages(messages, false);

					theTopic.data.remaining = remaining;

					console.log("Message loading took: " + (new Date().getTime() - loadMore));
					this.ne();
				}), cb);
				//load more messages and decrypt them.
			};

			this.loadNewest = function loadNewestF(cb) {
				step(function () {
					if (data.newest) {
						Topic.messageFromData(data.newest, this);
					} else {
						this.last.ne();
					}
				}, h.sF(function (message) {
					theTopic.addMessage(message, false);
					this.ne();
				}), cb);
			};

			Observer.call(theTopic);
		};

		Topic.fromData = function (data, cb) {
			cb = cb || h.nop;

			var t = new Topic(data);

			var id = t.getID();

			if (topics[id]) {
				$timeout(function () {
					cb(null, t.getID());
				});
				return topics[id];
			}

			topics[id] = t;

			step(function () {
				t.loadAllData(this);
			}, h.sF(function () {
				//add to topic list
				topicArray.push(t.data);

				console.log("Topic loaded:" + (new Date().getTime() - startup));
				this.ne(t.getID());
			}), cb);

			return t;
		};

		Topic.messageFromData = function (data, cb) {
			var messageToAdd = new Message(data), theTopic;
			var id = messageToAdd.getID();

			cb = cb || h.nop;

			if (messagesByID[id]) {
				$timeout(function () {
					cb(null, messagesByID[id]);
				});

				return;
			}

			messagesByID[id] = messageToAdd;

			step(function () {
				Topic.get(messageToAdd.getTopicID(), this);
			}, h.sF(function (_theTopic) {
				theTopic = _theTopic;

				messageToAdd.verifyParent(theTopic);
				messageToAdd.loadFullData(this);
			}), h.sF(function () {
				this.ne(messageToAdd);
			}), cb);
		};

		Topic.get = function (topicid, cb) {
			var theTopic;
			step(function () {
				if (topics[topicid]) {
					this.last.ne(topics[topicid]);
				} else {
					socket.emit("messages.getTopic", {
						topicid: topicid
					}, this);
				}
			}, h.sF(function (data) {
				if (!data.error) {
					theTopic = Topic.fromData(data.topic, this);
				} else {
					this.last.ne(false);
				}
			}), h.sF(function () {
				this.last.ne(theTopic);
			}), cb);
		};

		Topic.createRawData = function (receiver, cb) {
			var receiverObjects, topicKey, topicData;
			step(function () {
				//load receiver
				receiver = receiver.map(function (val) {
					if (typeof val === "object") {
						return val.getID();
					} else {
						return h.parseDecimal(val);
					}
				});

				h.removeArray(receiver, sessionService.getUserID());

				//get receiver objects
				userService.getMultiple(receiver, this);
			}, h.sF(function (receiverO) {
				receiverObjects = receiverO;

				//generate topic key
				keyStore.sym.generateKey(this, "topicMain");
			}), h.sF(function (key) {
				topicKey = key;

				//encrypt topic key with own mainkey
				keyStore.sym.symEncryptKey(topicKey, userService.getown().getMainKey(), this);
			}), h.sF(function () {
				//encrypt topic key for receiver
				var i, crypt;
				for (i = 0; i < receiverObjects.length; i += 1) {
					crypt = receiverObjects[i].getCryptKey();
					keyStore.sym.asymEncryptKey(topicKey, crypt, this.parallel());
				}

				if (receiverObjects.length === 0) {
					this.ne([]);
				}
			}), h.sF(function (cryptKeys) {
				var cryptKeysData = keyStore.upload.getKeys(cryptKeys);
				var receiverKeys = {}, receiverIDs = [];

				receiverObjects.forEach(function (receiver, index) {
					receiverIDs.push(receiver.getID());
					receiverKeys[receiver.getID()] = cryptKeys[index];
				});

				receiverIDs.push(userService.getown().getID());
				receiverIDs.sort();

				// topic hashable data.
				var topicMeta = {
					createTime: new Date().getTime(),
					receiver: receiverIDs,
					creator: userService.getown().getID()
				};

				//create data
				topicData = {
					keys: cryptKeysData.concat([keyStore.upload.getKey(topicKey)]),
					receiverKeys: receiverKeys
				};

				this.parallel.unflatten();
				SecuredData.create({}, topicMeta, { type: "topic" }, userService.getown().getSignKey(), topicKey, this);
			}), h.sF(function (tData) {
				topicData.topic = tData.meta;

				this.ne(topicData);
			}), cb);
		};

		Topic.reset = function () {
			messagesByID = {};
			topics = {};
			topicArray = sortedSet(sortObjGetTimeInv);
		};

		Topic.all = function () {
			return topicArray;
		};

		Topic.createData = function (receiver, message, images, cb) {
			var imagePreparation = Bluebird.resolve(images).map(function (image) {
				return image.prepare();
			});

			function uploadImages(topicKey) {
				return Bluebird.all(images.map(function (image) {
					return image.upload(topicKey);
				}));
			}

			var createRawTopicData = Bluebird.promisify(Topic.createRawData, Topic);
			var createRawMessageData = Bluebird.promisify(Message.createRawData, Message);

			var resultPromise = Bluebird.all([createRawTopicData(receiver), imagePreparation]).spread(function (topicData, imagesMeta) {
				var topic = new Topic({
					meta: topicData.topic,
					unread: []
				});

				var messageMeta = {
					createTime: new Date().getTime(),
					images: imagesMeta
				};

				return Bluebird.all([
					topicData,
					createRawMessageData(topic, message, messageMeta),
					uploadImages(topic.getKey())
				]);
			}).spread(function (topicData, messageData, imageKeys) {
				imageKeys = h.array.flatten(imageKeys);
				messageData.imageKeys = imageKeys.map(keyStore.upload.getKey);

				topicData.message = messageData;

				return topicData;
			});

			if (typeof cb === "function") {
				step.unpromisify(resultPromise, cb);
			}

			return resultPromise;
		};

		Observer.call(Topic);

		return Topic;
	}

	topicModel.$inject = ["$timeout", "ssn.windowService", "ssn.socketService", "ssn.userService", "ssn.keyStoreService", "ssn.sessionService", "ssn.models.message"];

	modelsModule.factory("ssn.models.topic", topicModel);
});
