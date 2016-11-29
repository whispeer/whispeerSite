/**
* Topic Model
**/
define([
	"whispeerHelper",
	"validation/validator",
	"asset/observer",
	"asset/sortedSet",
	"asset/securedDataWithMetaData",
	"bluebird",
	"debug",
	"models/modelsModule",
], function (h, validator, Observer, sortedSet, SecuredData, Bluebird, debug, modelsModule) {
	"use strict";

	var debugName = "whispeer:topic";
	var topicDebug = debug(debugName);

	function topicModel($timeout, $rootScope, windowService, socket, userService, keyStore, sessionService, Message, initService, TopicUpdate, Cache, ImageUpload) {
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
				newUnread = newUnread.map(h.parseDecimal);

				if (unreadMessages) {
					if (newUnread.length === 0 && unreadMessages.length > 0) {
						topicDebug("decrease unread count, topicid: " + data.topicid);
						Topic.notify(data.topicid, "read");
					} else if (newUnread.length > 0 && unreadMessages.length === 0) {
						topicDebug("increase unread count, topicid: " + data.topicid);
						Topic.notify(data.topicid, "unread");
					}
				}

				unreadMessages = newUnread;
				theTopic.data.unread = (unreadMessages.length > 0);

				messages.forEach(function (message) {
					message.unread = unreadMessages.indexOf(message.getID()) > -1;
				});
			}

			var receiver = meta.metaAttr("receiver");
			var latestTopicUpdate;

			this.data = {
				loaded: false,
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

			socket.on("connect", function () {
				window.setTimeout(function () {
					theTopic.refetchMessages();
				}, h.randomIntFromInterval(500, 5000));
			});

			this._useTopicUpdate = function (topicUpdateData) {
				if (!topicUpdateData) {
					return Bluebird.resolve();
				}

				var previousTopicUpdate = latestTopicUpdate;

				topicUpdateData = new TopicUpdate(topicUpdateData);

				latestTopicUpdate = topicUpdateData;
				return latestTopicUpdate.getTitle().bind(this).then(function (title) {
					latestTopicUpdate.ensureParent(this);

					if (previousTopicUpdate) {
						latestTopicUpdate.ensureIsAfterTopicUpdate(previousTopicUpdate);
					}

					this.data.title = title;
				}).then(function () {
					return latestTopicUpdate;
				});
			};

			this._useTopicUpdate(data.latestTopicUpdate);

			this.refetchMessages = function () {
				if (this.fetchingMessages) {
					return;
				}

				this.fetchingMessages = true;

				/*
					{
						oldest: id,
						inBetween: [ids],
						newest: id
					}
				*/
				/*
					Topic.makeMessage
				*/

				var sentMessages = this.getSentMessages().map(function (message) {
					return message.getServerID();
				});
				var oldest = sentMessages.shift();
				var newest = sentMessages.pop();

				var request = {
					topicid: this.getID(),
					oldest: oldest,
					newest: newest,
					inBetween: sentMessages,
					maximum: 20,
					messageCountOnFlush: 10
				};

				return socket.emit("messages.refetch", request).bind(this).then(function (response) {
					if (response.clearMessages) {
						//remove all sent messages we have!
						messages.clear();
						dataMessages.clear();
						//messages.join(unsentMessages);
						//dataMessages.join(unsentMessages.map(:data));
					}

					return response.messages;
				}).map(function (messageData) {
					return Topic.messageFromData(messageData);
				}).then(function (messages) {
					theTopic.addMessages(messages, false);
				}).finally(function () {
					this.fetchingMessages = false;
				});
			};

			this.awaitEarlierSend = function (time) {
				var previousMessages = this.getNotSentMessages().filter(function (message) {
					return message.getTime() < time;
				});

				if (previousMessages.length === 0) {
					return Bluebird.resolve();
				}

				return previousMessages[previousMessages.length - 1].getSendPromise();
			};

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

			this.wasReadOnOtherClient = function () {
				setUnread([]);
			};

			this.getLatestTopicUpdate = function () {
				return socket.definitlyEmit("messages.getLatestTopicUpdate", {
					topicID: this.getID()
				}).bind(this).then(function (response) {
					return this._useTopicUpdate(response.topicUpdate);
				});
			};

			this.setTitle = function (title) {
				return this.getLatestTopicUpdate().bind(this).then(function (previousTopicUpdate) {
					return TopicUpdate.create(this, {
						title: title,
						previousTopicUpdate: previousTopicUpdate
					});
				}).then(function (topicUpdate) {
					this._useTopicUpdate(topicUpdate);
				});
			};

			this.markRead = function markMessagesRead(cb) {
				if (!windowService.isVisible) {
					windowService.listenOnce(function () {
						theTopic.markRead(cb);
					}, "visible");
					return;
				}

				var unreadLength = unreadMessages.length;

				setUnread([]);

				if (unreadLength === 0) {
					return;
				}

				var messageTime = messages[messages.length - 1].getTime();

				return socket.definitlyEmit("messages.markRead", {
					topicid: theTopic.getID(),
					beforeTime: messageTime + 1
				}).then(function (data) {
					setUnread(data.unread);
				}).nodeify(cb);
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

			this.getSentMessages = function () {
				return messages.filter(function (m) {
					return m.hasBeenSent();
				});
			};

			this.getNotSentMessages = function () {
				return messages.filter(function (m) {
					return !m.hasBeenSent();
				});
			};

			this.getNewest = function () {
				var sentMessages = this.getSentMessages();
				return sentMessages[sentMessages.length - 1];
			};

			this.sendUnsentMessage = function (messageData, files) {
				var images = files.map(function (file) {
					return new ImageUpload(file);
				});

				return this.sendMessage(messageData.message, images, messageData.id);
			};

			this.sendMessage = function (message, images, id) {
				var messageObject = new Message(this, message, images, id);
				messagesByID[messageObject.getID()] = messageObject;
				this.addMessage(messageObject);

				var messageSendCache = new Cache("messageSend", { maxEntries: -1, maxBlobSize: -1 });

				if (!id) {
					messageSendCache.store(
						messageObject.getID(),
						{
							topicID: this.getID(),
							id: messageObject.getID(),
							message: message
						},
						images.map(function (image) {
							return image.getFile();
						})
					);
				}

				messageObject.sendContinously().then(function () {
					return messageSendCache.delete(messageObject.getID());
				}).catch(function (e) {
					console.error(e);
					alert("An error occured sending a message!" + e.toString());
				});

				return null;
			};

			this.addMessages = function (messages, addUnread) {
				messages.forEach(function (message) {
					var id = message.getID();
					data.newestTime = Math.max(message.getTime(), data.newestTime || 0);

					message.verifyParent(theTopic);

					if (addUnread && !theTopic.messageUnread(id) && !message.isOwn()) {
						setUnread(unreadMessages.concat([id]));
					}

					message.unread = theTopic.messageUnread(id);
				});

				addMessagesToList(messages);

				theTopic.notify(messages, "addMessages");

				topicArray.resort();

				if (theTopic.data.latestMessage.isOwn()) {
					this.markRead();
				}
			};

			this.addMessage = function addMessageF(message, addUnread) {
				this.addMessages([message], addUnread);
			};

			this.setIgnoreAsLastTopic = function (val) {
				this._ignoreAsLastTopic = val;
			};

			this.getIgnoreAsLastTopic = function () {
				return this._ignoreAsLastTopic;
			};

			this.verify = function(cb) {
				return Bluebird.try(function () {
					return userService.get(meta.metaAttr("creator"));
				}).then(function (creator) {
					if (creator.isNotExistingUser()) {
						theTopic.data.disabled = true;
						return false;
					}

					return meta.verify(creator.getSignKey()).thenReturn(true);
				}).then(function (addEncryptionIdentifier) {
					if (addEncryptionIdentifier) {
						keyStore.security.addEncryptionIdentifier(meta.metaAttr("_key"));
					}
				}).nodeify(cb);
			};

			this.loadReceiverNames = function loadRNF(cb) {
				return Bluebird.try(function () {
					return userService.getMultipleFormatted(receiver);
				}).then(function (receiverObjects) {
					var partners = theTopic.data.partners;

					if (partners.length > 0) {
						return;
					}

					receiverObjects.forEach(function (receiverObject) {
						if (!receiverObject.user.isOwn() || receiverObjects.length === 1) {
							partners.push(receiverObject);
						}
					});

					theTopic.data.partnersDisplay = partners.slice(0, 2);
					if (partners.length > 2) {
						theTopic.data.remainingUser = partners.length - 2;

						var i = 0;
						for (i = 2; i < partners.length; i += 1) {
							theTopic.data.remainingUserTitle += partners[i].name;
							if (i < partners.length - 1) {
								theTopic.data.remainingUserTitle += ", ";
							}
						}
					}
				}).nodeify(cb);
			};

			this.getReceiver = function () {
				return receiver;
			};

			this.loadAllData = function loadAllDataF(cb) {
				return Bluebird.try(function () {
					return theTopic.verify();
				}).then(function () {
					return theTopic.loadNewest();
				}).then(function () {
					return theTopic.loadReceiverNames();
				}).then(function () {
					theTopic.data.loaded = true;
				}).nodeify(cb);
			};

			this.loadInitialMessages = function loadInitialMessages(cb) {
				return Bluebird.try(function () {
					if (loadInitial) {
						loadInitial = false;
						return theTopic.loadMoreMessages(cb, 19);
					}
				}).nodeify(cb);
			};

			this.loadMoreMessages = function loadMoreMessagesF(cb, max) {
				var loadMore = new Date().getTime();
				var remaining = 0;

				if (theTopic.data.remaining === 0) {
					return Bluebird.resolve().nodeify(cb);
				}

				return socket.emit("messages.getTopicMessages", {
					topicid: theTopic.getID(),
					afterMessage: theTopic.getOldestID(),
					maximum: max
				}).then(function (data) {
					topicDebug("Message server took: " + (new Date().getTime() - loadMore));

					remaining = data.remaining;

					var messages = data.messages || [];

					return Bluebird.all(messages.map(function (messageData) {
						return Topic.messageFromData(messageData);
					}));
				}).then(function (messages) {
					theTopic.addMessages(messages, false);

					theTopic.data.remaining = remaining;

					topicDebug("Message loading took: " + (new Date().getTime() - loadMore));
				}).nodeify(cb);
				//load more messages and decrypt them.
			};

			this.loadNewest = function(cb) {
				if (!data.newest) {
					return Bluebird.resolve().nodeify(cb);
				}

				return Bluebird.try(function () {
					return Topic.messageFromData(data.newest);
				}).then(function (message) {
					theTopic.addMessage(message, false);
				}).nodeify(cb);
			};

			Observer.call(theTopic);
		};

		Topic.multipleFromData = function (topicsData) {
			return Bluebird.resolve(topicsData).map(function (topicData) {
				return Topic.createTopicAndAdd(topicData);
			}).map(function (topic) {
				return Topic.loadTopic(topic);
			}).then(function (topics) {
				return topics;
			});
		};

		Topic.createTopicAndAdd = function (topicData) {
			var topic = new Topic(topicData);

			var id = topic.getID();

			if (topics[id]) {
				return topics[id];
			}

			topics[id] = topic;

			topicArray.push(topic.data);

			return topic;
		};

		Topic.loadTopic = function (topic) {
			if (topic.data.loaded) {
				return Bluebird.resolve(topic);
			}

			var promise = Bluebird.promisify(topic.loadAllData.bind(topic))().thenReturn(topic);

			promise.then(function (id) {
				topicDebug("Topic loaded (" + id + "):" + (new Date().getTime() - startup));
			});

			return promise;
		};

		Topic.fromData = function (topicData) {
			return Bluebird.resolve(topicData).then(function (topicData) {
				var topic = Topic.createTopicAndAdd(topicData);
				return Topic.loadTopic(topic);
			});
		};

		Topic.messageFromData = function (data, cb) {
			var messageToAdd = new Message(data), theTopic;
			var id = messageToAdd.getID();

			cb = cb || h.nop;

			if (messagesByID[id]) {
				return Bluebird.resolve(messagesByID[id]).nodeify(cb);
			}

			messagesByID[id] = messageToAdd;

			return Bluebird.try(function () {
				return Topic.get(messageToAdd.getTopicID());
			}).then(function (_theTopic) {
				theTopic = _theTopic;

				messageToAdd.verifyParent(theTopic);
				return messageToAdd.loadFullData().thenReturn(messageToAdd);
			}).nodeify(cb);
		};

		Topic.get = function (topicid, cb) {
			if (topics[topicid]) {
				return Bluebird.resolve(topics[topicid]).nodeify(cb);
			}

			return initService.awaitLoading().then(function () {
				return socket.definitlyEmit("messages.getTopic", {
					topicid: topicid
				});
			}).then(function (data) {
				return Topic.fromData(data.topic);
			}).then(function (theTopic) {
				theTopic.setIgnoreAsLastTopic(true);
				return theTopic;
			}).nodeify(cb);
		};

		Topic.createRawData = function (receiver, cb) {
			var receiverObjects, topicKey, topicData;
			return Bluebird.try(function () {
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
				return userService.getMultiple(receiver);
			}).then(function (receiverO) {
				receiverObjects = receiverO;

				//generate topic key
				return keyStore.sym.generateKey(null, "topicMain");
			}).then(function (key) {
				topicKey = key;

				//encrypt topic key with own mainkey
				return keyStore.sym.symEncryptKey(topicKey, userService.getown().getMainKey());
			}).then(function () {
				//encrypt topic key for receiver
				return Bluebird.all(receiverObjects.map(function (receiverObject) {
					var crypt = receiverObject.getCryptKey();
					return keyStore.sym.asymEncryptKey(topicKey, crypt);
				}));
			}).then(function (cryptKeys) {
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

				return SecuredData.createAsync({}, topicMeta, { type: "topic" }, userService.getown().getSignKey(), topicKey);
			}).then(function (tData) {
				topicData.topic = tData.meta;

				return topicData;
			}).nodeify(cb);
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

			var createRawTopicData = Bluebird.promisify(Topic.createRawData.bind(Topic));
			var createRawMessageData = Bluebird.promisify(Message.createRawData.bind(Message));

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

			return resultPromise.nodeify(cb);
		};

		Observer.call(Topic);

		return Topic;
	}

	topicModel.$inject = ["$timeout", "$rootScope", "ssn.windowService", "ssn.socketService", "ssn.userService", "ssn.keyStoreService", "ssn.sessionService", "ssn.models.message", "ssn.initService", "ssn.models.topicUpdate", "ssn.cacheService", "ssn.imageUploadService"];

	modelsModule.factory("ssn.models.topic", topicModel);
});
