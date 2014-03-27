/**
* MessageService
**/
define(["step", "whispeerHelper", "validation/validator", "asset/observer", "asset/sortedSet"], function (step, h, validator, Observer, sortedSet) {
	"use strict";

	function sortGetTime(a, b) {
		return (a.getTime() - b.getTime());
	}

	function sortObjGetTime(a, b) {
		return (a.obj.getTime() - b.obj.getTime());
	}

	function sortObjGetTimeInv(a, b) {
		return (b.obj.getTime() - a.obj.getTime());
	}


	var service = function ($rootScope, $timeout, socket, sessionService, userService, keyStore, initService) {
		var messages = {};
		var topics = {};

		var listeners = [];

		var topicArray = sortedSet(sortObjGetTimeInv);

		var Message = function (data) {
			var theMessage = this;

			var meta = data.meta;
			var content = data.content;
			var ownMessage;

			this.data = {
				text: "",
				timestamp: meta.sendTime,

				loading: true,
				loaded: false,

				sender: {
					"id": meta.sender,
					"name": "",
					"url": "",
					"image": "/assets/img/user.png"
				},

				id: meta.messageid,
				obj: this
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
				return h.parseDecimal(meta.messageid);
			};

			this.getTopicID = function getTopicIDF() {
				return meta.topicid;
			};

			this.getTime = function getTimeF() {
				return meta.sendTime;
			};

			this.isOwn = function isOwnF() {
				return ownMessage;
			};

			this.loadSender = function loadSenderF(cb) {
				var theSender;
				step(function () {
					userService.get(meta.sender, this);
				}, h.sF(function loadS1(sender) {
					this.parallel.unflatten();

					theSender = sender;
					sender.loadBasicData(this);
				}), h.sF(function loadS2() {
					theMessage.data.sender = theSender.data;
					ownMessage = theSender.isOwn();

					this.ne();
				}), cb);
			};

			this.loadFullData = function loadFullDataF(cb) {
				step(function l1() {
					theMessage.decrypt(this);
				}, h.sF(function l2() {
					theMessage.loadSender(this);
				}), h.sF(function l3() {
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

					theMessage.data.text = text.substr(randomPart + 2);

					this.ne(text);
				}), cb);
			};
		};

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

			var unread;

			function setUnread(newUnread) {
				if (unread) {
					if (newUnread.length === 0 && unread.length > 0) {
						messageService.data.unread -= 1;
					} else if (newUnread.length > 0 && unread.length === 0) {
						messageService.data.unread += 1;
					}
				}

				unread = newUnread.map(h.parseDecimal);
				theTopic.data.unread = (unread.length > 0);
				var i;
				for (i = 0; i < messages.length; i += 1) {
					messages[i].unread = (unread.indexOf(messages[i].getID()) > -1);
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
				return unread.indexOf(mid) > -1;
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
				mid = h.parseDecimal(mid);
				step(function () {
					if (unread.indexOf(mid) > -1) {
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

			function addMessageToList(m) {
				//add to message list
				messages.push(m);
				dataMessages.push(m.data);
				messagesByID[m.getID()] = m;
			}

			this.addMessage = function addMessageF(m, addUnread, cb) {
				step(function () {
					if (m.getTime() > data.newestTime) {
						data.newestTime = m.getTime();
					}
					topicArray.resort();

					m.loadFullData(this);
				}, h.sF(function () {
					addMessageToList(m);

					theTopic.data.latestMessage = messages[messages.length - 1];
					if (addUnread) {
						if (!theTopic.messageUnread(m.getID()) && !m.isOwn()) {
							setUnread(unread.concat([m.getID()]));
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

					if (partners.length > 4) {
						theTopic.data.partnersDisplay = partners.slice(0, 3);
						theTopic.data.remainingUser = partners.length - 3;
						for (i = 3; i < partners.length; i += 1) {
							theTopic.data.remainingUserTitle += partners[i].name;
							if (i < partners.length - 1) {
								theTopic.data.remainingUserTitle += ", ";
							}
						}
					} else {
						theTopic.data.partnersDisplay = partners.slice(0, 4);
						if (theTopic.data.partnersDisplay.length < 4 && theTopic.data.partnersDisplay.length > 1) {
							theTopic.data.partnersDisplay.push(me);
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

		Message.createData = function (topic, message, cb) {
			step(function () {
				if (typeof topic !== "object") {
					Topic.get(topic, this);
				} else {
					this.ne(topic);
				}
			}, h.sF(function (rTopic) {
				topic = rTopic;
				keyStore.random.hex(128-(message.length%128), this);
			}), h.sF(function (random) {
				message = random + "::" + message;

				var newest = topic.data.latestMessage;

				var meta = {
					createTime: new Date().getTime(),
					topicHash: newest.getTopicHash(),
					previousMessage: h.parseDecimal(newest.getID()),
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
				keyStore.sym.generateKey(this, "messageMain");
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

				meta.ownHash = keyStore.hash.hashObjectHex(encryptedMessageData);

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
				var topicKeyData = keyStore.upload.getKey(topicKey);
				var receiver = [];
				var receiverIDs;

				var i;
				for (i = 0; i < receiverObjects.length; i += 1) {
					var cur = receiverObjects[i];
					receiver.push({
						identifier: cur.getID(),
						key: cryptKeysData[i]
					});

				}

				receiver.push({
					identifier: userService.getown().getID()
				});

				receiverIDs = receiver.map(function (e) {
					return e.identifier;
				});

				//create data
				result = {
					topic: {
						createTime: new Date().getTime(),
						key: topicKeyData,
						receiver: receiver
					}
				};

				// topic hashable data.
				var topicHashData = {
					createTime: result.topic.createTime,
					key: topicKey,
					receiver: receiverIDs
				};

				topicHash = keyStore.hash.hashObjectHex(topicHashData);

				keyStore.random.hex(128-(message.length%128), this);
			}), h.sF(function (random) {
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

		function callListener(message) {
			var i;
			for (i = 0; i < listeners.length; i += 1) {
				try {
					listeners[i](message);
				} catch (e) {
					console.log(e);
				}
			}
		}

		socket.listen("message", function (e, data) {
			if (!e) {
				if (data.topic) {
					var t = makeTopic(data.topic, function () {
						if (data.message) {
							var m = makeMessage(data.message, true, function () {
								$timeout(function () {
									callListener(m);
								});
							});
						}
					});

					if (t.data.unread) {
						messageService.data.unread += 1;
					}
				} else if (data.message) {
					var m = makeMessage(data.message, true, function () {
						$timeout(function () {
							callListener(m);
						});
					});
				}
			} else {
				console.error(e);
			}
		});

		var currentlyLoadingTopics = false;

		var messageService = {
			listenNewMessage: function (func) {
				listeners.push(func);
			},
			reset: function () {
				messages = {};
				topics = {};
				topicArray = sortedSet(sortObjGetTimeInv);
				listeners = [];
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
						makeTopic(latest.topics[i]);
					}

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
				}), h.sF(function (result) {
					socket.emit("messages.sendNewTopic", result, this);
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
					Message.createData(topic, message, this);
				}, h.sF(function (result) {
					socket.emit("messages.send", result, this);
				}), h.sF(function (result) {
					if (!result.success) {
						window.setTimeout(function () {
							messageService.sendMessage(topic, message, cb, count + 1);
						}, 50);

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

		initService.register("messages.getUnreadCount", {}, function (data) {
			messageService.data.unread = data.unread;
		});

		$rootScope.$on("ssn.reset", function () {
			messageService.reset();
		});

		return messageService;
	};

	service.$inject = ["$rootScope", "$timeout", "ssn.socketService", "ssn.sessionService", "ssn.userService", "ssn.keyStoreService", "ssn.initService"];

	return service;
});