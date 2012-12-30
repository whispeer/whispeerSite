//TODO: event listener for new messages in a topic.
//TODO: SendMessage: Add Receiver (LOW Priority)

define(["jquery", "asset/helper", "libs/step", "model/userManager", "model/session", "crypto/crypto", "crypto/sessionKey", "asset/logger", "asset/exceptions"], function ($, h, step, userManager, session, crypto, SessionKey, logger, exception) {
	"use strict";

	var topics = {};
	var messages = {};

	var mMakeTopic;
	var mMakeMessage;
	var messageManager;


	var Topic = function (jsonData) {
		var topicid, receiver, receiverObj, newestSend, newest, read, key, symKey, listeners = [];

		this.getID = function () {
			return topicid;
		};

		this.getReceiver = function () {
			return receiver;
		};

		this.addNewMessageListener = function (theListener) {
			listeners.push(theListener);
		};

		this.getReceiverObj = function (callback, reload) {
			step(function () {
				if (typeof receiverObj === "undefined" || !!reload) {
					userManager.loadUsers(receiver, userManager.BASIC, this);
				} else {
					this.last.ne(receiverObj);
				}
			}, h.sF(function (u) {
				receiverObj = u;
				this.ne(u);
			}), callback);
		};

		this.getNewestSend = function () {
			return newestSend;
		};

		this.getRead = function () {
			return read;
		};

		this.getKey = function () {
			return key;
		};

		this.getSessionKey = function () {
			return key;
		};

		this.decryptKey = function (callback) {
			step(function () {
				if (h.isset(symKey) && symKey.isSymKey()) {
					symKey.decryptKey(session.getMainKey(), this);
				} else {
					key.decryptKey(session.getKey(), this);
				}
			}, h.sF(function (res) {
				if (res) {
					if (h.isset(symKey) && symKey.isSymKey()) {
						key = symKey;
					} else {
						h.setSymAsymKey(key);
					}
				}

				this.ne(res);
			}), callback);
		};

		/*this.addMessage = function (m) {
			if (typeof m !== "object") {
				m = mMakeMessage(m);
			}
			
			if (m.getTopicID() === topicid) {
				
			}
		};*/

		/** get the latest messags for a topic.
		* @param callback function to call with results
		* @param start startpoint
		* @param count number of messages to get
		* @author Nilos
		*/
		this.getLatestMessages = function (callback, start, count) {
			step(function () {
				h.getData({"messages": {"topicmessages": topicid}}, this);
			}, h.sF(function (d) {
				var result = [];

				var data = d.messages.topicmessages[topicid];
				var count = data.count;
				delete data.count;

				var messageid;
				for (messageid in data) {
					if (data.hasOwnProperty(messageid)) {
						result.push(mMakeMessage(data[messageid]));
					}
				}

				this.ne(result);
			}), callback);
		};

		var loadFromJSON = function (data) {
			if (typeof data !== "object") {
				data = $.parseJSON(data);
			}

			if (data === null) {
				return false;
			}

			if (h.isset(data.topicid) && h.isset(data.receiver) && h.isset(data.newestSend) && h.isset(data.newest) && h.isset(data.read) && h.isset(data.key)) {
				topicid = data.topicid;
				receiver = data.receiver;

				var i = 0;
				var idx = -1;
				for (i = 0; i < receiver.length; i += 1) {
					if (receiver[i] === parseInt(session.userid(), 10)) {
						idx = i;
						break;
					}
				}

				if (idx !== -1) { receiver.splice(idx, 1); }

				key = new SessionKey(data.key);

				if (h.isset(data.symKey)) {
					symKey = new SessionKey(data.symKey);
				}

				newestSend = data.newestSend;
				newest = data.newest;
				read = data.read;

				return true;
			}

			return false;
		};

		if (!loadFromJSON(jsonData)) {
			logger.log(jsonData);
			throw new exception.messageNotFound(topicid);
		}
	};

	var Message = function (jsonData) {
		var messageid, topicid, topic, signature, decryptedMessage, message, iv, sender, senderObj, sendDate, read;
		var signatureChecked = false;
		var theMessage = this;

		this.getID = function () {
			return messageid;
		};

		this.getTopicID = function () {
			return topicid;
		};

		this.getTopic = function (callback) {
			step(function () {
				if (typeof topic === "object") {
					this.last.ne(topic);
				} else {
					messageManager.getTopic(topicid, this);
				}
			}, h.sF(function (topicObj) {
				topic = topicObj;
				this.ne(topic);
			}), callback);
		};

		/** id of the sender of this message */
		this.getSender = function () {
			return sender;
		};

		this.getSenderObj = function (callback) {
			step(function () {
				if (typeof senderObj === "undefined") {
					userManager.getUser(theMessage.getSender(), userManager.BASIC, this);
				} else {
					this.last.ne(senderObj);
				}
			}, h.sF(function (u) {
				senderObj = u;
				this.ne(senderObj);
			}), callback);
		};

		this.getMessage = function (callback) {
			step(function () {
				if (typeof decryptedMessage === "undefined") {
					theMessage.getTopic(this);
				} else {
					this.last.ne(decryptedMessage);
				}
			}, h.sF(function (topic) {
				topic.decryptKey(this);
			}), h.sF(function () {
				var sk = topic.getSessionKey();
				if (sk.isSymKey()) {
					crypto.decryptText(session.getMainKey(), '{"ct":"' + message + '","iv":"' + iv + '"}', sk, this);
				} else {
					crypto.decryptText(session.getKey(), '{"ct":"' + message + '","iv":"' + iv + '"}', sk, this);
				}
			}), h.sF(function (m) {
				decryptedMessage = m;
				this.ne(decryptedMessage);
			}), callback);
		};

		this.checkSignature = function (callback) {
			step(function () {
				if (signatureChecked === true) {
					this.last.ne(true);
				} else {
					theMessage.getSenderObj(this.parallel());
					theMessage.getMessage(this.parallel());
				}
			}, h.sF(function (d) {
				d[1].checkSignature(signature, d[0], callback);
			}), callback);
		};

		this.getSendDate = function () {
			return sendDate;
		};

		this.getRead = function () {
			return read;
		};

		this.getReceiver = function (callback) {
			step(function () {
				theMessage.getTopic(this);
			}, h.sF(function (t) {
				this.ne(t.getReceiver());
			}), callback);
		};

		this.getReceiverObj = function (callback) {
			step(function () {
				theMessage.getTopic(this);
			}, h.sF(function (t) {
				t.getReceiverObj(this);
			}), callback);
		};

		this.markRead = function (callback, isRead) {
			step(function () {
				throw new Error("not implemented");
			}, callback);
			//TODO
			//send read request to server
		};

		var loadFromJSON = function (data) {
			if (typeof data !== "object") {
				data = $.parseJSON(data);
			}

			if (data === null) {
				return false;
			}

			if (h.isset(data.topicid)
					&& h.isset(data.messageid)
					&& h.isset(data.signature)
					&& h.isset(data.message)
					&& h.isset(data.iv)
					&& h.isset(data.sender)
					&& h.isset(data.sendDate)
					&& h.isset(data.read)) {
				messageid = data.messageid;
				topicid = data.topicid;

				if (typeof data.topic !== "undefined") {
					mMakeTopic(data.topic);
				}

				signature = data.signature;
				message = data.message;
				iv = data.iv;
				sender = data.sender;
				sendDate = data.sendDate;
				read = data.read;

				return true;
			}

			logger.log(data);
			return false;
		};

		if (!loadFromJSON(jsonData)) {
			throw new exception.messageNotFound(topicid);
		}
	};

	/** get a already loaded topic
	* @param topicid id of the topic
	* @return topicobject
	*/
	var getLoadedTopic = function (topicid) {
		return topics[topicid];
	};

	mMakeTopic = function (jsonData) {
		if (typeof jsonData.topicid !== "undefined") {
			var theTopic;

			if (messageManager.topicLoaded(jsonData.topicid)) {
				theTopic = getLoadedTopic(jsonData.topicid);
			} else {
				theTopic = new Topic(jsonData);
				topics[jsonData.topicid] = theTopic;
			}

			return theTopic;
		}

		throw new exception.messageNotFound(jsonData.topicid);
	};

	/** get a loaded message
	* @param messageid id of the message
	* @author Nilos
	*/
	var getLoadedMessage = function (messageid) {
		return messages[messageid];
	};

	/** Messages */
	mMakeMessage = function (jsonData) {
		if (typeof jsonData.messageid !== "undefined") {
			var theMessage;

			if (messageManager.messageLoaded(jsonData.messageid)) {
				theMessage = getLoadedMessage(jsonData.messageid);
			} else {
				theMessage = new Message(jsonData);
				messages[jsonData.messageid] = theMessage;
			}

			return theMessage;
		}

		throw new exception.messageNotFound(jsonData.messageid);
	};

	/** send a new message (with a not existing topic)
	* @param message message text to send
	* @param receiver who receives the message?
	* @param callback called when message was send
	* @callback true: success, false: didn't work
	* @author Nilos
	*/
	var sendNewMessage = function (message, receiver, callback) {
		var EM, theResult;
		step(function () {
			receiver.push(session.userid());

			userManager.getPublicKeys(receiver, this);
		}, h.sF(function (publicKeys) {
			crypto.encryptText(publicKeys, message, this);
		}), h.sF(function (result) {
			theResult = result;
			EM = $.parseJSON(result.EM);
			crypto.signText(session.getKey(), message, this);
		}), h.sF(function (signature) {
			var getData = {
				"sendMessage": {
					"receiver": theResult.sessionKeys,
					"iv": EM.iv,
					"message": EM.ct,
					"signature": signature
				}
			};

			h.getData(getData, this);
		}), h.sF(function (result) {
			this.ne(result.sendMessage);
		}), callback);
	};

	/** add a new message to a topic
	* @param message message text
	* @param topicid topic to add the message to
	* @param callback called when message was send
	* @callback true: success, false: didn't work
	* @author Nilos
	*/
	var continueMessage = function (message, topicid, callback) {
		var EM;
		step(function continueMessage1() {
			messageManager.getTopic(topicid, this);
		}, h.sF(function (topic) {
			EM = topic.getSessionKey().encryptText(message);
			EM = $.parseJSON(EM);
			crypto.signText(session.getKey(), message, this);
		}), h.sF(function (signature) {
			var getData = {
				"sendMessage": {
					"iv": EM.iv,
					"message": EM.ct,
					"signature": signature,
					"topic": topicid
				}
			};
			h.getData(getData, this);
		}), h.sF(function (data) {
			this.ne(data.sendMessage);
		}), callback);
	};

	var continueAndAddReceiver = function (message, receiver, topicid, callback) {
		throw new Error("not implemented");
	};

	messageManager = {
		/** load topics
		* @param topicids ids of the topics (array)
		* @param callback called with results
		* @callback topic objects
		* @author Nilos
		*/
		loadTopics: function (topicids, callback) {
			var loaded = [];
			step(function loadTopicSetup() {
				var i = 0;

				var request = [];

				for (i = 0; i < topicids.length; i += 1) {
					if (messageManager.topicLoaded(topicids[i])) {
						loaded.push(getLoadedTopic(topicids[i]));
					} else {
						request.push(topicids[i]);
					}
				}

				if (request.length > 0) {
					h.getData({"messages": {"topic": request}}, this);
				} else {
					this.last.ne(loaded);
				}
			}, h.sF(function (data) {
				var topics = data.messages.topic;
				var result = [];

				var id;
				for (id in topics) {
					if (topics.hasOwnProperty(id)) {
						result.push(mMakeTopic(topics[id]));
					}
				}

				this.ne(result.concat(loaded));
			}), callback);
		},
		/** get a topic
		* @param topicid id of the topic
		* @param callback called with result
		* @callback topic object
		*/
		getTopic: function (topicid, callback) {
			step(function () {
				messageManager.loadTopics([topicid], this);
			}, h.sF(function (data) {
				this.ne(data[0]);
			}), callback);
		},
		/** is a topic already in memory?
		* @param topicid id of the topic
		* @author Nilos
		*/
		topicLoaded: function (topicid) {
			return (typeof topics[topicid] === "object");
		},
		/** load messages
		* @param messageids messages to load (array)
		* @param callback called with results
		* @author Nilos
		* @callback message objects
		*/
		loadMessages: function (messageids, callback) {
			var loaded = [];
			step(function loadMessageSetup() {
				var i = 0;

				var request = [];

				for (i = 0; i < messageids.length; i += 1) {
					if (messageManager.messageLoaded(messageids[i])) {
						loaded.push(getLoadedMessage(messageids[i]));
					} else {
						request.push(messageids[i]);
					}
				}

				if (request.length > 0) {
					h.getData({"messages": {"message": request}}, this);
				} else {
					this.last.ne(loaded);
				}
			}, h.sF(function (data) {
				var messages = data.messages.message;
				var result = [];

				var id;
				for (id in messages) {
					if (messages.hasOwnProperty(id)) {
						result.push(mMakeMessage(messages[id]));
					}
				}

				this.ne(result.concat(loaded));
			}), callback);
		},
		getMessage: function (messageid, callback) {
			step(function () {
				messageManager.loadMessages([messageid], this);
			}, h.sF(function (m) {
				this.ne(m[0]);
			}), callback);
		},
		/** check if a message is already loaded
		* @param messageid id of message
		* @author Nilos
		*/
		messageLoaded: function (messageid) {
			return (typeof messages[messageid] === "object");
		},
		/** get the latest topics for this user
		* @param callback called with results
		* @param start optional - offset to start at
		* @param count optional - number of records to request
		* @author Nilos
		* @callback message objects (array).
		*/
		getLatestTopics: function (callback, start, count) {
			step(function getLatestTopicsSetup() {
				if (typeof start === "undefined") {
					start = 0;
				}

				if (typeof count === "undefined") {
					count = 10;
				}

				h.getData({"messages": {"latest": {"start": start, "count": count}}}, this);
			}, h.sF(function (data) {
				var latest = data.messages.latest;
				var count = latest.count;
				delete latest.count;

				var result = [];

				var topicid;
				for (topicid in latest) {
					if (latest.hasOwnProperty(topicid)) {
						result.push(mMakeMessage(latest[topicid]));
					}
				}

				this.ne(result, count);
			}), callback);
		},

		/** send a message
		* @param message message text
		* @param receiver who to send messages to
		* @param topicid topic to add message to
		* @param callback called with true/false on success/failure
		* @author Nilos
		* if topicid = undefined -> new topic; if receiver undefined = add to topic, if both undefined = failure, if both defined: add person to the read list of a topic.
		*/
		sendMessage: function (message, receiver, topicid, callback) {
			step(function setupSendMessage() {
				if (typeof receiver !== "undefined" && typeof topicid !== "undefined") {
					continueAndAddReceiver(message, receiver, topicid, this);
				} else if (typeof topicid !== "undefined") {
					continueMessage(message, topicid, this);
				} else if (typeof receiver !== "undefined") {
					sendNewMessage(message, receiver, this);
				} else {
					this.ne(false);
				}
			}, callback);
		},

		/** get the topic on which the current user last send a message to a user
		* @param userid user to get the last topic for
		* @param callback called with result
		* @callback topic object
		* @author Nilos
		*/
		getUserTopic: function (userid, callback) {
			step(function getUserTopic1() {
				h.getData({"messages": {"userTopic": userid}}, this);
			}, h.sF(function getUserTopic2(d) {
				var result = d.messages.userTopic;
				if (typeof result === "object") {
					result = mMakeTopic(d.messages.userTopic);
				} else {
					result = null;
				}

				this.ne(result);
			}), callback);
		},
		/** Te : Text; Re: Receiver; Se: Sender */
		/** get the text, receivers and sender for messages
		* @param m array of message objects
		* @param callback called with results
		* @callback array with objects which have got the following attributes:
		*	m: message object
		*	t: message text
		*	r: receivers array
		*	s: sender user object
		* @author Nilos
		*/
		getMessagesTeReSe: function (m, callback) {
			logger.time("TeReSe");
			var userids = [];
			step(function teReSe1() {
				var i = 0;
				for (i = 0; i < m.length; i += 1) {
					m[i].getReceiver(this.parallel());

					userids.push(m[i].getSender());
					//m[i].getReceiverObj(this.parallel());
					//m[i].getSenderObj(this.parallel());
				}
			}, h.sF(function (data) {
				var i;
				for (i = 0; i < m.length; i += 1) {
					userids = userids.concat(data[i]);
				}

				userManager.loadUsers(userids, userManager.BASIC, this);
			}), h.sF(function () {
				var i = 0;
				for (i = 0; i < m.length; i += 1) {
					m[i].getMessage(this.parallel());
					m[i].getReceiverObj(this.parallel());
					m[i].getSenderObj(this.parallel());
				}
			}), h.sF(function (data) {
				var result = [];

				var i;
				for (i = 0; i < m.length; i += 1) {
					result[i] = {
						"m": m[i],
						"t": data[i * 3],
						"r": data[i * 3 + 1],
						"s": data[i * 3 + 2]
					};
				}

				logger.timeEnd("TeReSe");
				this.ne(result);
			}), callback);
		}
	};

	return messageManager;
});