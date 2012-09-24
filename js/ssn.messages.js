"use strict";
if (typeof (ssn) === "undefined") {
	var ssn = {};
}

function isset(value) {
	return (typeof value !== "undefined" && value !== null);
}

var ssnH = ssn.helper;

//TODO: event listener for new messages in a topic.
//TODO: Sendmessage should return topic and messageid or false
//TODO: get the topic for a certain user (needs API)
//TODO: SendMessage: Add Receiver (LOW Priority)

ssn.messages = function () {
	var topics = {};
	var messages = {};

	var mMakeTopic;
	var mMakeMessage;

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

		this.getReceiverObj = function (callback) {
			if (typeof receiverObj === "undefined") {
				ssn.userManager.loadUsers(receiver, ssn.userManager.BASIC, function (u) {
					receiverObj = u;
					callback(u);
				});
			} else {
				callback(receiverObj);
			}
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

		this.decryptKey = function () {
			var result;

			if (ssnH.isset(symKey) && symKey.isSymKey()) {
				result = symKey.decryptKey(ssn.session.mainKey);

				if (result === true) {
					key = symKey;

					return true;
				}
			}

			result = key.decryptKey(ssn.session.key);
			ssn.helper.setSymAsymKey(key);

			return result;
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
			ssn.helper.getData({"messages": {"topicmessages": topicid}}, function (d) {
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

				callback(result);
			});
		};

		var loadFromJSON = function (data) {
			if (typeof data !== "object") {
				data = $.parseJSON(data);
			}

			if (data === null) {
				return false;
			}

			if (isset(data.topicid) && isset(data.receiver) && isset(data.newestSend) && isset(data.newest) && isset(data.read) && isset(data.key)) {
				topicid = data.topicid;
				receiver = data.receiver;

				var i = 0;
				var idx = -1;
				for (i = 0; i < receiver.length; i += 1) {
					if (receiver[i] === parseInt(ssn.session.userid, 10)) {
						idx = i;
						break;
					}
				}

				if (idx !== -1) { receiver.splice(idx, 1); }

				key = new ssn.crypto.sessionKey(data.key);

				if (ssnH.isset(data.symKey)) {
					symKey = new ssn.crypto.sessionKey(data.symKey);
				}

				newestSend = data.newestSend;
				newest = data.newest;
				read = data.read;

				var result;

				if (ssnH.isset(symKey) && symKey.isSymKey()) {
					result = symKey.decryptKey(ssn.session.mainKey);

					if (result === true) {
						key = symKey;

						return true;
					}
				}

				result = key.decryptKey(ssn.session.key);
				ssn.helper.setSymAsymKey(key);

				return result;
			}

			return false;
		};

		if (!loadFromJSON(jsonData)) {
			ssn.logger.log(jsonData);
			throw new ssn.exception.messageNotFound(topicid);
		}
	};

	var Message = function (jsonData) {
		var messageid, topicid, topic, signature, decryptedMessage, message, iv, sender, senderObj, sendDate, read;

		this.getID = function () {
			return messageid;
		};

		this.getTopicID = function () {
			return topicid;
		};

		this.getTopic = function (callback) {
			if (typeof topic === "object") {
				callback(topic);
			} else {
				ssn.messages.getTopic(topicid, function (topicObj) {
					topic = topicObj;
					callback(topic);
				});
			}
		};

		this.getMessage = function (callback) {
			if (typeof decryptedMessage === "undefined") {
				this.getTopic(function (topic) {
					var sk = topic.getSessionKey();

					ssn.crypto.decryptText(ssn.session.key, '{"ct":"' + message + '","iv":"' + iv + '"}', sk, function (m) {
						decryptedMessage = m;
						callback(m);
					});
				});
			} else {
				callback(decryptedMessage);
			}
		};

		this.checkSignature = function (callback) {
			var m = this;
			m.getSenderObj(function (u) {
				m.getMessage(function (m) {
					u.checkSignature(signature, m, callback);
				});
			});
		};

		/** id of the sender of this message */
		this.getSender = function () {
			return sender;
		};

		this.getSenderObj = function (callback) {
			if (typeof senderObj === "undefined") {
				ssn.userManager.getUser(this.getSender(), ssn.userManager.BASIC, function (u) {
					senderObj = u;
					callback(senderObj);
				});
			} else {
				callback(senderObj);
			}
		};

		this.getReceiverObj = function (callback) {
			this.getTopic(function (t) {
				t.getReceiverObj(callback);
			});
		};

		this.getSendDate = function () {
			return sendDate;
		};

		this.getRead = function () {
			return read;
		};

		this.markRead = function (callback, isRead) {
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

			if (isset(data.topicid)
					&& isset(data.messageid)
					&& isset(data.signature)
					&& isset(data.message)
					&& isset(data.iv)
					&& isset(data.sender)
					&& isset(data.sendDate)
					&& isset(data.read)) {
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

			ssn.logger.log(data);
			return false;
		};

		if (!loadFromJSON(jsonData)) {
			throw new ssn.exception.messageNotFound(topicid);
		}
	};

	mMakeTopic = function (jsonData) {
		if (typeof jsonData.topicid !== "undefined") {
			var theTopic;

			if (ssn.messages.topicLoaded(jsonData.topicid)) {
				theTopic = ssn.messages.getLoadedTopic(jsonData.topicid);
			} else {
				theTopic = new Topic(jsonData);
				topics[jsonData.topicid] = theTopic;
			}

			return theTopic;
		}

		throw new ssn.exception.messageNotFound(jsonData.topicid);
	};

	/** load topics
	* @param topicids ids of the topics (array)
	* @param callback called with results
	* @callback topic objects
	* @author Nilos
	*/
	this.loadTopics = function (topicids, callback) {
		var i = 0;

		var request = [];
		var loaded = [];

		for (i = 0; i < topicids.length; i += 1) {
			if (ssn.messages.topicLoaded(topicids[i])) {
				loaded.push(this.getLoadedTopic(topicids[i]));
			} else {
				request.push(topicids[i]);
			}
		}

		if (request.length > 0) {
			ssn.helper.getData({"messages": {"topic": request}}, function (data) {
				var topics = data.messages.topic;
				var result = [];

				var id;
				for (id in topics) {
					if (topics.hasOwnProperty(id)) {
						result.push(mMakeTopic(topics[id]));
					}
				}

				callback(result.concat(loaded));
			});
		} else {
			callback(loaded);
		}
	};

	/** get a already loaded topic
	* @param topicid id of the topic
	* @return topicobject
	*/
	this.getLoadedTopic = function (topicid) {
		return topics[topicid];
	};

	/** get a topic
	* @param topicid id of the topic
	* @param callback called with result
	* @callback topic object
	*/
	this.getTopic = function (topicid, callback) {
		this.loadTopics([topicid], function (m) {
			callback(m[0]);
		});
	};

	/** is a topic already in memory?
	* @param topicid id of the topic
	* @author Nilos
	*/
	this.topicLoaded = function (topicid) {
		return (typeof topics[topicid] === "object");
	};

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
	this.getMessagesTeReSe = function (m, callback) {
		var mcounter = 0;
		var ucounter = 0;
		var scounter = 0;

		var texts = [];
		var users = [];
		var sender = [];

		var done = function () {
			if (ucounter === m.length && mcounter === m.length && scounter === m.length) {
				var result = [];

				var i;
				for (i = 0; i < m.length; i += 1) {
					result[i] = {
						"m": m[i],
						"t": texts[i],
						"r": users[i],
						"s": sender[i]
					};
				}

				callback(result);
			}
		};

		if (m.length === 0) {
			done();
		}

		var cMessageFunc = function (c) {
			return function (message) {
				mcounter += 1;
				texts[c] = message;
				done();
			};
		};

		var cReceiverFunc = function (c) {
			return function (user) {
				ucounter += 1;
				users[c] = user;
				done();
			};
		};

		var cSenderFunc = function (c) {
			return function (user) {
				scounter += 1;
				sender[c] = user;
				done();
			};
		};

		var i = 0;
		for (i = 0; i < m.length; i += 1) {
			m[i].getMessage(cMessageFunc(i));
			m[i].getReceiverObj(cReceiverFunc(i));
			m[i].getSenderObj(cSenderFunc(i));
		}
	};

	/** Messages */
	mMakeMessage = function (jsonData) {
		if (typeof jsonData.messageid !== "undefined") {
			var theMessage;

			if (ssn.messages.messageLoaded(jsonData.messageid)) {
				theMessage = ssn.messages.getLoadedMessage(jsonData.messageid);
			} else {
				theMessage = new Message(jsonData);
				messages[jsonData.messageid] = theMessage;
			}

			return theMessage;
		}

		throw new ssn.exception.messageNotFound(jsonData.messageid);
	};

	/** load messages
	* @param messageids messages to load (array)
	* @param callback called with results
	* @author Nilos
	* @callback message objects
	*/
	this.loadMessages = function (messageids, callback) {
		var i = 0;

		var request = [];
		var loaded = [];

		for (i = 0; i < messageids.length; i += 1) {
			if (ssn.messages.messageLoaded(messageids[i])) {
				loaded.push(this.getLoadedMessage(messageids[i]));
			} else {
				request.push(messageids[i]);
			}
		}

		if (request.length > 0) {
			ssn.helper.getData({"messages": {"message": request}}, function (data) {
				var messages = data.messages.message;
				var result = [];

				var id;
				for (id in messages) {
					if (messages.hasOwnProperty(id)) {
						result.push(mMakeMessage(messages[id]));
					}
				}

				callback(result.concat(loaded));
			});
		} else {
			callback(loaded);
		}
	};

	/** get a loaded message
	* @param messageid id of the message
	* @author Nilos
	*/
	this.getLoadedMessage = function (messageid) {
		return messages[messageid];
	};

	this.getMessage = function (messageid, callback) {
		this.loadMessages([messageid], function (m) {
			callback(m[0]);
		});
	};

	/** check if a message is already loaded
	* @param messageid id of message
	* @author Nilos
	*/
	this.messageLoaded = function (messageid) {
		return (typeof messages[messageid] === "object");
	};

	/** get the latest topics for this user
	* @param callback called with results
	* @param start optional - offset to start at
	* @param count optional - number of records to request
	* @author Nilos
	* @callback topic objects (array).
	*/
	var getLatestTopics = function (callback, start, count) {
		var time = new Date().getTime();
		if (typeof start === "undefined") {
			start = 0;
		}

		if (typeof count === "undefined") {
			count = 10;
		}

		ssn.helper.getData({"messages": {"latest": {"start": start, "count": count}}}, function (data) {
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

			callback(result);
		});
	};

	/** send a new message (with a not existing topic)
	* @param message message text to send
	* @param receiver who receives the message?
	* @param callback called when message was send
	* @callback true: success, false: didn't work
	* @author Nilos
	*/
	var sendNewMessage = function (message, receiver, callback) {
		receiver.push(ssn.session.userid);

		ssn.userManager.getPublicKeys(receiver, function (publicKeys) {
			ssn.crypto.encryptText(publicKeys, message, function (result) {
				var EM = $.parseJSON(result.EM);
				ssn.crypto.signText(ssn.session.key, message, function (signature) {
					var getData = {
						"sendMessage": {
							"receiver": result.sessionKeys,
							"iv": EM.iv,
							"message": EM.ct,
							"signature": signature
						}
					};
					ssn.helper.getData(getData, function (result) {

						callback(result.sendMessage);
					});
				});
			});
		});
	};

	/** add a new message to a topic
	* @param message message text
	* @param topicid topic to add the message to
	* @param callback called when message was send
	* @callback true: success, false: didn't work
	* @author Nilos
	*/
	var continueMessage = function (message, topicid, callback) {
		ssn.messages.getTopic(topicid, function (topic) {
			var EM = topic.getSessionKey().encryptText(message);
			EM = $.parseJSON(EM);
			ssn.crypto.signText(ssn.session.key, message, function (signature) {
				var getData = {
					"sendMessage": {
						"iv": EM.iv,
						"message": EM.ct,
						"signature": signature,
						"topic": topicid
					}
				};
				ssn.helper.getData(getData, function (result) {
					callback(result.sendMessage);
				});
			});
		});
	};

	/** get the topic on which the current user last send a message to a user
	* @param userid user to get the last topic for
	* @param callback called with result
	* @callback topic object
	* @author Nilos
	*/
	this.getUserTopic = function (userid, callback) {
		ssn.helper.getData({"messages": {"userTopic": userid}}, function (d) {
			var result = d.messages.userTopic;
			if (typeof result === "object") {
				result = mMakeTopic(d.messages.userTopic);
			} else {
				result = null;
			}

			callback(result);
		});
	};

	/** send a message
	* @param message message text
	* @param receiver who to send messages to
	* @param topicid topic to add message to
	* @param callback called with true/false on success/failure
	* @author Nilos
	* if topicid = undefined -> new topic; if receiver undefined = add to topic, if both undefined = failure, if both defined: add person to the read list of a topic.
	*/
	this.sendMessage = function (message, receiver, topicid, callback) {
		if (typeof receiver !== "undefined" && typeof topicid !== "undefined") {
			continueAndAddReceiver(message, receiver, topicid, callback);
		} else if (typeof topicid !== "undefined") {
			continueMessage(message, topicid, callback);
		} else if (typeof receiver !== "undefined") {
			sendNewMessage(message, receiver, callback);
		} else {
			callback(false);
		}
	};

	this.getLatest = getLatestTopics;
	this.getLatestTopics = getLatestTopics;
};

var messages = new ssn.messages();
ssn.messages = messages;