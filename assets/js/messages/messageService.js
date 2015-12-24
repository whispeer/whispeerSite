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

	var service = function ($rootScope, errorService, socket, sessionService, initService, windowService, Topic) {
		function addSocketMessage(messageData) {
			if (messageData) {
				var messageToAdd;

				step(function () {
					Topic.messageFromData(messageData, this);
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
					var t = Topic.fromData(data.topic, function () {
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

				step(function () {
					l.loading = true;

					var last;
					if (Topic.all().length > 0) {
						last = Topic.all()[Topic.all().length - 1].obj.getID();
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
						Topic.fromData(latest.topics[i], this.parallel());
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
				}), h.sF(function () {
					this.ne(theTopic);
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
					Topic.fromData(result.topic, cb);
				}), cb || h.nop);
			},
			sendMessage: function (topicID, message, images, cb) {
				var getTopic = Bluebird.promisify(Topic.get, Topic);

				var resultPromise = Bluebird.resolve(topicID).then(function (topic) {
					if (typeof topic !== "object") {
						return getTopic(topic);
					} else {
						return topic;
					}
				}).then(function (topic) {
					topic.sendMessage(message, images);
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
					data: Topic.all()
				},
				unread: 0
			}
		};

		Observer.call(messageService);

		function updateReadCount() {
			if (messageService.data.unread < 0) {
				console.log("set unread count to zero");
				messageService.data.unread = 0;
			}

			if (messageService.data.unread === 0) {
				windowService.removeAdvancedTitle("newmessage");
			}
		}

		Topic.listen(function () {
			messageService.data.unread -= 1;
			updateReadCount();
		}, "read");

		Topic.listen(function () {
			messageService.data.unread += 1;
			updateReadCount();
		}, "unread");

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

	service.$inject = ["$rootScope", "ssn.errorService", "ssn.socketService", "ssn.sessionService", "ssn.initService", "ssn.windowService", "ssn.models.topic"];

	messagesModule.factory("ssn.messageService", service);
});
