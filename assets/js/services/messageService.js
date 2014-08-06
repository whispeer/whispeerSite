/**
* MessageService
**/
define([
		"step",
		"whispeerHelper",
		"validation/validator",
		"asset/observer",
		"asset/sortedSet",
		"asset/securedDataWithMetaData"
	], function (step, h, validator, Observer, sortedSet, SecuredData) {
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

			var err = validator.validate("topic", data);
			if (err) {
				console.log("Topic Data Invalid! Fix this!");
				//throw err;
			}

			if (typeof data.key === "object") {
				data.key = keyStore.upload.addKey(data.key);
			}

			if (typeof data.additionalKey === "object") {
				keyStore.upload.addKey(data.additionalKey);
			}

			var unreadMessages;

			function setUnread(newUnread) {
				if (unreadMessages) {
					if (newUnread.length === 0 && unreadMessages.length > 0) {
						messageService.data.unread -= 1;
					} else if (newUnread.length > 0 && unreadMessages.length === 0) {
						messageService.data.unread += 1;
					}
				}

				if (messageService.data.unread === 0) {
					windowService.removeAdvancedTitle("newmessage");
				}

				unreadMessages = newUnread.map(h.parseDecimal);
				theTopic.data.unread = (unreadMessages.length > 0);
				var i;
				for (i = 0; i < messages.length; i += 1) {
					messages[i].unread = (unreadMessages.indexOf(messages[i].getID()) > -1);
				}
			}

			this.data = {
				remaining: 1,

				messages: dataMessages,

				partners: [],
				partnersDisplay: [],

				remainingUser: "",
				remainingUserTitle: "",

				id: data.topicid,
				type: (data.receiver.length <= 2 ? "peerChat" : "groupChat"),
				obj: this
			};

			setUnread(data.unread);

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
				return data.topicHash;
			};

			this.getID = function getIDF() {
				return h.parseDecimal(data.topicid);
			};

			this.getTime = function getTimeF() {
				return data.newestTime;
			};

			this.getKey = function getKeyF() {
				return data.key;
			};

			var timerRunning, messageTime;
			this.markRead = function markMessagesRead(mid, cb) {
				if (!windowService.isVisible) {
					windowService.listenOnce(function () {
						theTopic.markRead(mid, cb);
					}, "visible");
					return;
				}

				mid = h.parseDecimal(mid);
				step(function () {
					if (unreadMessages.indexOf(mid) > -1) {
						var lMessageTime = messagesByID[mid].getTime();
						if (timerRunning) {
							if (lMessageTime > messageTime) {
								messageTime = lMessageTime;
							}
						} else {
							timerRunning = true;
							messageTime = lMessageTime;
							window.setTimeout(this, 100);
						}
					}
				}, h.sF(function () {
					timerRunning = false;
					socket.emit("messages.markRead", {
						topicid: theTopic.getID(),
						beforeTime: messageTime
					}, this);
				}), h.sF(function (data) {
					setUnread(data.unread);
					this.ne();
				}), cb);
			};

			var messagesBuffer = [];
			var delayMessageAdding = false;

			function addMessageToList(m) {
				messagesByID[m.getID()] = m;

				//add to message list
				messagesBuffer.push(m);
				
				if (!delayMessageAdding) {
					theTopic.runMessageAdding();
				}
			}

			this.delayMessageAdding = function () {
				delayMessageAdding = true;
			};

			this.runMessageAdding = function () {
				delayMessageAdding = false;

				messages.join(messagesBuffer);
				dataMessages.join(messagesBuffer.map(function (e) {
					return e.data;
				}));

				messagesBuffer = [];

				theTopic.data.latestMessage = messages[messages.length - 1];
			};

			this.addMessage = function addMessageF(m, addUnread, cb) {
				step(function () {
					data.newestTime = Math.max(m.getTime(), data.newestTime);
					topicArray.resort();

					m.loadFullData(this);
				}, h.sF(function () {
					addMessageToList(m);

					if (addUnread) {
						if (!theTopic.messageUnread(m.getID()) && !m.isOwn()) {
							setUnread(unreadMessages.concat([m.getID()]));
						}
					}
					m.unread = theTopic.messageUnread(m.getID());

					if (cb) {
						this.ne();
					}
				}), cb);
			};

			this.loadReceiverNames = function loadRNF(cb) {
				step(function () {
					userService.getMultipleFormatted(data.receiver, this);
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
					if (partners.length > 4) {
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
				return data.receiver.slice();
			};

			this.loadAllData = function loadAllDataF(cb) {
				step(function () {
					theTopic.loadReceiverNames(this);
				}, h.sF(function () {
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
					theTopic.delayMessageAdding();
					console.log("Message server took: " + (new Date().getTime() - loadMore));
					theTopic.data.remaining = data.remaining;
					if (data.messages) {
						var i;
						for (i = 0; i < data.messages.length; i += 1) {
							makeMessage(data.messages[i], false, this.parallel());
						}
					}

					this.parallel()();
				}), h.sF(function () {
					theTopic.runMessageAdding();
					console.log("Message loading took: " + (new Date().getTime() - loadMore));
					this.ne();
				}), cb);
				//load more messages and decrypt them.
			};

			this.loadNewest = function loadNewestF(cb) {
				step(function () {
					if (data.newest) {
						makeMessage(data.newest, false, this);
					} else {
						this.ne();
					}
				}, cb);
			};
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

		Topic.createData = function (receiver, message, cb) {
			var receiverObjects, topicKey, topicData, topicHash;
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

				// topic hashable data.
				var topicMeta = {
					createTime: new Date().getTime(),
					key: topicKey,
					receiver: receiverIDs,
					creator: userService.getown().getID()
				};

				//create data
				topicData = {
					keys: cryptKeysData.concat([keyStore.upload.getKey(topicKey)]),
					receiverKeys: receiverKeys
				};

				topicHash = keyStore.hash.hashObjectHex(topicMeta);

				var messageMeta = {
					createTime: new Date().getTime(),
					topicHash: topicHash,
					previousMessage: 0,
					previousMessageHash: "0"
				};

				this.parallel.unflatten();
				SecuredData.create({}, topicMeta, {}, userService.getown().getSignKey(), topicKey, this.parallel());
				Message.createRawData(topicKey, message, messageMeta, this.parallel());
			}), h.sF(function (tData, mData) {
				topicData.topic = tData;
				topicData.message = mData;

				this.ne(topicData);
			}), cb);
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

		function makeMessage(data, addUnread, cb) {
			var m = new Message(data);

			var id = m.getID();

			cb = cb || h.nop;

			if (messages[id]) {
				$timeout(cb);
				return messages[id];
			}

			messages[id] = m;

			step(function () {
				Topic.get(m.getTopicID(), this);
			}, h.sF(function (theTopic) {
				theTopic.addMessage(m, addUnread, this);
			}), cb);

			return m;
		}

		function addSocketMessage(messageData) {
			if (messageData) {
				var message = makeMessage(messageData, true, function () {
					$timeout(function () {
						messageService.notify(message, "message");
					});
				});
			}
		}

		socket.listen("message", function (e, data) {
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
			sendMessageToUserTopicIfExists: function(receiver, message, cb) {
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
					messageService.sendMessage(theTopic, message, this);
				}), h.sF(function (success) {
					if (success) {
						this.ne(theTopic);
					} else {
						this("message send failed");
					}
				}), cb);
			},
			sendNewTopic: function (receiver, message, cb) {
				step(function () {
					if (receiver.length === 1) {
						messageService.sendMessageToUserTopicIfExists(receiver, message, this);
					} else {
						this.ne(false);
					}
				}, h.sF(function (topic) {
					if (topic) {
						this.last.ne(topic.getID());
					} else {
						Topic.createData(receiver, message, this);
					}
				}), h.sF(function (topicData) {
					socket.emit("messages.sendNewTopic", topicData, this);
				}), h.sF(function (result) {
					makeTopic(result.topic, cb);
				}), cb || h.nop);
			},
			sendMessage: function (topic, message, cb, count) {
				step(function () {
					if (!count) {
						count = 0;
					} else if (count > 5) {
						this.last.ne(false);
						return;
					}

					if (typeof topic !== "object") {
						Topic.get(topic, this);
					} else {
						this.ne(topic);
					}
				}, h.sF(function (topic) {
					Message.createData(topic, message, this);
				}), h.sF(function (result) {
					socket.emit("messages.send", result, this);
				}), h.sF(function (result) {
					if (!result.success) {
						//TODO: really improve this!
						window.setTimeout(function () {
							messageService.sendMessage(topic, message, cb, count + 1);
						}, 200);

						return;
					}

					this.ne(true);
				}), cb);
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

		initService.register("messages.getUnreadCount", {}, function (data, cb) {
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

	return service;
});
