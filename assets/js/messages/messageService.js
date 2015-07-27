/**
* MessageService
**/
define([
		"step",
		"whispeerHelper",
		"validation/validator",
		"messages/messagesModule",
		"asset/observer",
		"asset/sortedSet",
		"asset/securedDataWithMetaData",
		"bluebird"
	], function (step, h, validator, messagesModule, Observer, sortedSet, SecuredData, Bluebird) {
	"use strict";

	var messageService;

	function sortGetTime(a, b) {
		return (a.getTime() - b.getTime());
	}

	function sortObjGetTime(a, b) {
		return (a.obj.getTime() - b.obj.getTime());
	}

	function sortObjGetTimeInv(a, b) {
		return (b.obj.getTime() - a.obj.getTime());
	}

	var service = function ($rootScope, $timeout, errorService, socket, sessionService, userService, keyStore, initService, windowService, Message) {
		var messages = {};
		var topics = {};

		var topicArray = sortedSet(sortObjGetTimeInv);

		var Topic = function (data) {
			var messages = sortedSet(sortGetTime), dataMessages = sortedSet(sortObjGetTime), messagesByID = {}, theTopic = this, loadInitial = true;

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
						messageService.data.unread -= 1;
					} else if (newUnread.length > 0 && unreadMessages.length === 0) {
						console.log("increase unread count, topicid: " + data.topicid);
						messageService.data.unread += 1;
					}

					if (messageService.data.unread < 0) {
						console.log("set unread count to zero");
						messageService.data.unread = 0;
					}
				}

				if (messageService.data.unread === 0) {
					windowService.removeAdvancedTitle("newmessage");
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
					return messages[0].getID();
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
				messagesToAdd.forEach(function (message) {
					messagesByID[message.getID()] = message;
				});

				messages.join(messagesToAdd);
				dataMessages.join(messagesToAdd.map(function (e) {
					return e.data;
				}));

				theTopic.data.latestMessage = messages[messages.length - 1];
			}

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
							makeMessage(messageData, this.parallel());
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
						makeMessage(data.newest, this);
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
					theTopic = makeTopic(data.topic, this);
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
				step.unpromisify(resultPromise, h.addAfterHook(cb, $rootScope.$apply.bind($rootScope, null)));
			}

			return resultPromise;
		};

		function makeTopic(data, cb) {
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
		}

		function makeMessage(data, cb) {
			var messageToAdd = new Message(data), theTopic;
			var id = messageToAdd.getID();

			cb = cb || h.nop;

			if (messages[id]) {
				$timeout(function () {
					cb(null, messages[id]);
				});
			}

			messages[id] = messageToAdd;

			step(function () {
				Topic.get(messageToAdd.getTopicID(), this);
			}, h.sF(function (_theTopic) {
				theTopic = _theTopic;

				messageToAdd.verifyParent(theTopic);
				messageToAdd.loadFullData(this);
			}), h.sF(function () {
				this.ne(messageToAdd);
			}), cb);
		}

		function addSocketMessage(messageData) {
			if (messageData) {
				var messageToAdd;

				step(function () {
					makeMessage(messageData, this);
				}, h.sF(function (_messageToAdd) {
					messageToAdd = _messageToAdd;
					Topic.get(messageToAdd.getTopicID(), this);
				}), h.sF(function (theTopic) {
					theTopic.addMessage(messageToAdd, true);
					messageService.notify(messageToAdd, "message");
				}), errorService.criticalError);
			}
		}

		socket.channel("message", function (e, data) {
			if (!e) {
				if (data.topic) {
					var t = makeTopic(data.topic, function () {
						addSocketMessage(data.message);
					});

					if (t.data.unread) {
						messageService.data.unread += 1;
					}
				} else {
					addSocketMessage(data.message);
				}
			} else {
				errorService.criticalError(e);
			}
		});

		var currentlyLoadingTopics = false;

		var activeTopic = 0;

		messageService = {
			isActiveTopic: function (topicid) {
				return activeTopic === h.parseDecimal(topicid);
			},
			setActiveTopic: function (topicid) {
				activeTopic = h.parseDecimal(topicid);
			},
			reset: function () {
				messages = {};
				topics = {};
				topicArray = sortedSet(sortObjGetTimeInv);
				messageService.data.latestTopics = {
						count: 0,
						loading: false,
						loaded: false,
						data: topicArray
				};

				messageService.data.unread = 0;
			},
			loadMoreLatest: function (cb) {
				var l = messageService.data.latestTopics;
				messageService.listenOnce(cb, "loadingDone");

				if (l.loading) {
					return;
				}

				step(function () {
					l.loading = true;

					var last;
					if (topicArray.length > 0) {
						last = topicArray[topicArray.length - 1].obj.getID();
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

					this.parallel()();
				}), h.sF(function () {
					messageService.notify("", "loadingDone");
				}));
			},
			getTopic: function (topicid, cb) {
				step(function () {
					if (currentlyLoadingTopics) {
						messageService.listenOnce(this, "loadingDone");
					} else {
						this.ne();
					}
				}, h.sF(function () {
					Topic.get(topicid, this);
				}), cb);
			},
			sendMessageToUserTopicIfExists: function(receiver, message, images, cb) {
				var theTopic;
				step(function () {
					messageService.getUserTopic(receiver[0], this);
				}, h.sF(function (topicid) {
					if (topicid) {
						Topic.get(topicid, this);
					} else {
						this.last.ne();
					}
				}), h.sF(function (topic) {
					theTopic = topic;
					var otherReceiver = theTopic.getReceiver();
					otherReceiver = otherReceiver.map(h.parseDecimal);

					if (otherReceiver.length === 2) {
						if (otherReceiver.indexOf(receiver[0]) > -1 && otherReceiver.indexOf(sessionService.getUserID()) > -1) {
							this.ne(theTopic);
							return;
						}
					} else if (otherReceiver.length === 1) {
						if (receiver[0] === otherReceiver[0]) {
							this.ne(theTopic);
							return;
						}
					}

					console.log("send to existing user topic failed");

					this.last.ne();
				}), h.sF(function () {
					messageService.sendMessage(theTopic, message, images, this);
				}), h.sF(function (success) {
					if (success) {
						this.ne(theTopic);
					} else {
						this("message send failed");
					}
				}), cb);
			},
			sendNewTopic: function (receiver, message, images, cb) {
				step(function () {
					if (receiver.length === 1) {
						messageService.sendMessageToUserTopicIfExists(receiver, message, images, this);
					} else {
						this.ne(false);
					}
				}, h.sF(function (topic) {
					if (topic) {
						this.last.ne(topic.getID());
					} else {
						Topic.createData(receiver, message, images, this);
					}
				}), h.sF(function (topicData) {
					socket.emit("messages.sendNewTopic", topicData, this);
				}), h.sF(function (result) {
					makeTopic(result.topic, cb);
				}), cb || h.nop);
			},
			sendMessage: function (_topic, message, images, cb) {
				var topic;

				var imagePreparation = Bluebird.resolve(images).map(function (image) {
					return image.prepare();
				});

				function uploadImages() {
					return Bluebird.all(images.map(function (image) {
						return image.upload(topic.getKey());
					}));
				}

				var getTopic = Bluebird.promisify(Topic.get, Topic);
				var createMessageData = Bluebird.promisify(Message.createData, Message);

				var resultPromise = Bluebird.resolve(_topic).then(function (topic) {
					if (typeof topic !== "object") {
						return getTopic(topic);
					} else {
						return topic;
					}
				}).then(function (_topic) {
					topic = _topic;

					return imagePreparation;
				}).then(function (imagesMetaData) {
					return Bluebird.all([createMessageData(topic, message, imagesMetaData), uploadImages()]);
				}).spread(function (result, imageKeys) {
					imageKeys = h.array.flatten(imageKeys);
					result.message.imageKeys = imageKeys.map(keyStore.upload.getKey);

					return socket.emit("messages.send", result);
				}).then(function (response) {
					if (!response.success) {
						throw new Error("failed to send message");
					}

					return true;
				});

				if (typeof cb === "function") {
					step.unpromisify(resultPromise, h.addAfterHook(cb, $rootScope.$apply.bind($rootScope, null)));
				}

				return resultPromise;
			},
			getUserTopic: function (uid, cb) {
				step(function () {
					socket.emit("messages.getUserTopic", {
						userid: uid
					}, this);
				}, h.sF(function (data) {
					if (data.topicid) {
						this.ne(data.topicid);
					} else {
						this.ne(false);
					}
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

		Observer.call(messageService);

		initService.get("messages.getUnreadCount", undefined, function (data, cb) {
			messageService.data.unread = h.parseDecimal(data.unread) || 0;

			messageService.listen(function(m) {
				if (!m.isOwn()) {
					if (!messageService.isActiveTopic(m.getTopicID()) || !windowService.isVisible) {
						windowService.playMessageSound();
						windowService.sendLocalNotification("message", m.data);
					}

					windowService.setAdvancedTitle("newmessage", m.data.sender.basic.shortname);
				}
			}, "message");

			cb();
		});

		$rootScope.$on("ssn.reset", function () {
			messageService.reset();
		});

		return messageService;
	};

	service.$inject = ["$rootScope", "$timeout", "ssn.errorService", "ssn.socketService", "ssn.sessionService", "ssn.userService", "ssn.keyStoreService", "ssn.initService", "ssn.windowService", "ssn.models.message"];

	messagesModule.factory("ssn.messageService", service);
});
