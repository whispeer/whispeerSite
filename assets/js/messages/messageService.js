/**
* MessageService
**/

var h = require("whispeerHelper");
var Observer = require("asset/observer");
var Bluebird = require("bluebird");

var errorService = require("services/error.service").errorServiceInstance;
var socket = require("services/socket.service").default;
var sessionService = require("services/session.service");
var initService = require("services/initService");
var Cache = require("services/Cache.ts").default;

var Topic = require("models/topic");

var messageService;

function addSocketMessage(messageData) {
	if (messageData) {
		var messageToAdd;

		Bluebird.try(function () {
			return Topic.messageFromData(messageData);
		}).then(function (_messageToAdd) {
			messageToAdd = _messageToAdd;
			return Topic.get(messageToAdd.getTopicID());
		}).then(function (theTopic) {
			theTopic.addMessage(messageToAdd, true);
			messageService.notify(messageToAdd, "message");
		}).catch(errorService.criticalError);
	}
}

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
		Topic.reset();

		messageService.data.latestTopics = {
				count: 0,
				loading: false,
				loaded: false,
				data: Topic.all()
		};

		messageService.data.unread = 0;
	},
	loadMoreLatest: function (cb) {
		var l = messageService.data.latestTopics;
		messageService.listenOnce(cb, "loadingDone");

		if (l.loading) {
			return;
		}

		l.loading = true;

		return initService.awaitLoading().then(function () {
			var last, topics = Topic.all().filter(function (topic) {
				return !topic.obj.getIgnoreAsLastTopic();
			});

			if (topics.length > 0) {
				last = topics[topics.length - 1].obj.getID();
			} else {
				last = 0;
			}

			return socket.emit("messages.getTopics", {
				afterTopic: last
			});
		}).then(function (latest) {
			l.loaded = true;
			l.loading = false;

			if (latest.topics.length === 0) {
				l.allTopicsLoaded = true;
			}

			return Topic.multipleFromData(latest.topics);
		}).then(function (topics) {
			topics.forEach(function (topic) {
				topic.setIgnoreAsLastTopic(false);
			});

			messageService.notify("", "loadingDone");
		}).catch(errorService.criticalError);
	},
	sendUnsentMessages: function () {
		var messageSendCache = new Cache("messageSend", { maxEntries: -1, maxBlobSize: -1 });

		return Bluebird.resolve(messageSendCache.all().toArray()).map(function (unsentMessage) {
			var data = JSON.parse(unsentMessage.data);

			return messageService.getTopic(data.topicID).then(function (topic) {
				return topic.sendUnsentMessage(data, unsentMessage.blobs);
			});
		});
	},
	getTopic: function (topicid, cb) {
		return Bluebird.try(function () {
			if (currentlyLoadingTopics) {
				return messageService.listenPromise("loadingDone");
			}
		}).then(function () {
			return Topic.get(topicid);
		}).nodeify(cb);
	},
	sendMessageToUserTopicIfExists: function(receiver, message, images) {
		return messageService.getUserTopic(receiver).then(function (topicid) {
			if (!topicid) {
				return;
			}

			return Topic.get(topicid).then(function (topic) {
				var otherReceiver = topic.getReceiver().map(h.parseDecimal);

				if (otherReceiver.length > 2) {
					console.log("send to existing user topic failed as more than two users in receiver list");
					return false;
				}

				if (otherReceiver.indexOf(receiver) === -1) {
					console.log("send to existing user topic failed as other user is not in receiver list");
					return false;
				}

				if (otherReceiver.indexOf(sessionService.getUserID()) > -1) {
					console.log("send to existing user topic failed as own user is not in receiver list");
					return false;
				}

				return messageService.sendMessage(topic, message, images).thenReturn(topic);
			});
		});
	},
	sendNewTopic: function (receiver, message, images) {
		return Bluebird.try(function () {
			if (receiver.length === 1) {
				return messageService.sendMessageToUserTopicIfExists(receiver, message, images);
			}

			return false;
		}).then(function (topic) {
			if (topic) {
				return topic.getID();
			}

			return Topic.createData(receiver, message, images).then(function (topicData) {
				return socket.emit("messages.sendNewTopic", topicData);
			}).then(function (result) {
				return Topic.multipleFromData([result.topic]);
			}).then(function (topics) {
				return topics[0].getID();
			});
		});
	},
	sendMessage: function (topicID, message, images, cb) {
		var getTopic = Bluebird.promisify(Topic.get.bind(Topic));

		var resultPromise = Bluebird.resolve(topicID).then(function (topic) {
			if (typeof topic !== "object") {
				return getTopic(topic);
			} else {
				return topic;
			}
		}).then(function (topic) {
			return topic.sendMessage(message, images);
		});

		return resultPromise.nodeify(cb);
	},
	getUserTopic: function (uid, cb) {
		return initService.awaitLoading().then(function () {
			return socket.definitlyEmit("messages.getUserTopic", {
				userid: uid
			});
		}).then(function (data) {
			if (data.topicid) {
				return data.topicid;
			}

			return false;
		}).nodeify(cb);
	},
	data: {
		latestTopics: {
			count: 0,
			loading: false,
			loaded: false,
			data: Topic.all()
		},
		unread: 0
	}
};

Observer.extend(messageService);

function updateReadCount() {
	messageService.data.unread = messageService.data.unreadIDs.length;

	messageService.notify(messageService.data.unreadIDs, "updateUnread");
}

function updateUnreadIDs(ids) {
	ids = ids.map(h.parseDecimal);

	messageService.data.unreadIDs = ids;

	Topic.all().filter(function (topic) {
		return topic.unread;
	}).forEach(function (topic) {
		var id = h.parseDecimal(topic.id);
		if (ids.indexOf(id) === -1) {
			topic.obj.wasReadOnOtherClient();
		}
	});

	updateReadCount();
}

function changeReadTopic(topicID, read) {
	topicID = h.parseDecimal(topicID);

	h.removeArray(messageService.data.unreadIDs, topicID);

	if (!read) {
		messageService.data.unreadIDs.unshift(topicID);
	}

	updateReadCount();
}

socket.channel("message", function (e, data) {
	if (!e) {
		if (data.topic) {
			Topic.fromData(data.topic).then(function (topic) {
				if (topic.data.unread) {
					changeReadTopic(topic.getID(), true);
				}

				addSocketMessage(data.message);
			});
		} else {
			addSocketMessage(data.message);
		}
	} else {
		errorService.criticalError(e);
	}
});

socket.channel("unreadTopics", function (e, data) {
	if (e) {
		return;
	}

	updateUnreadIDs(data.unread);
});

function loadUnreadTopicIDs() {
	return initService.awaitLoading().then(function () {
		return Bluebird.delay(500);
	}).then(function () {
		return socket.awaitConnection();
	}).then(function () {
		return socket.emit("messages.getUnreadTopicIDs", {});
	}).then(function (data) {
		updateUnreadIDs(data.unread);
	});
}

socket.on("connect", function () {
	loadUnreadTopicIDs();
});

Topic.listen(function (id) {
	changeReadTopic(id, true);
}, "read");

Topic.listen(function (id) {
	changeReadTopic(id, false);
}, "unread");

initService.listen(function () {
	loadUnreadTopicIDs();
	messageService.sendUnsentMessages();
}, "initDone");

module.exports = messageService;
