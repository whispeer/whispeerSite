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
				}).catch(errorService);
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
			sendMessageToUserTopicIfExists: function(receiver, message, images, cb) {
				var theTopic;
				step(function () {
					return messageService.getUserTopic(receiver[0]);
				}, h.sF(function (topicid) {
					if (topicid) {
						return Topic.get(topicid);
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
					return messageService.sendMessage(theTopic, message, images);
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
					return Topic.multipleFromData([result.topic]).then(function (topics) {
						return topics[0].getID();
					});
				}), cb || h.nop);
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

				if (typeof cb === "function") {
					resultPromise.nodeify(h.addAfterHook(cb, $rootScope.$apply.bind($rootScope)));
				}

				return resultPromise;
			},
			getUserTopic: function (uid, cb) {
				return initService.awaitLoading().then(function () {
					return socket.definitlyEmit("messages.getUserTopic", {
						userid: uid
					});
				}), h.sF(function (data) {
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

		Observer.call(messageService);

		function updateReadCount() {
			messageService.data.unread = messageService.data.unreadIDs.length;

			if (messageService.data.unread === 0) {
				windowService.removeAdvancedTitle("newmessage");
			}
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

		messageService.listen(function(m) {
			if (!m.isOwn()) {
				if (!messageService.isActiveTopic(m.getTopicID()) || !windowService.isVisible) {
					windowService.playMessageSound();
					windowService.sendLocalNotification("message", m.data);
				}

				windowService.setAdvancedTitle("newmessage", m.data.sender.basic.shortname);
			}
		}, "message");

		initService.listen(function () {
			loadUnreadTopicIDs();
		}, "initDone");

		$rootScope.$on("ssn.reset", function () {
			messageService.reset();
		});

		return messageService;
	};

	service.$inject = ["$rootScope", "ssn.errorService", "ssn.socketService", "ssn.sessionService", "ssn.initService", "ssn.windowService", "ssn.models.topic"];

	messagesModule.factory("ssn.messageService", service);
});
