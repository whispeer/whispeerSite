define(["jquery", "display", "libs/step", "model/messages", "asset/helper", "model/userManager", "model/session"], function ($, display, step, messages, h, userManager, session) {
	"use strict";

	var topic;
	var receiver;
	var topicObject;
	var topicMessages;
	var topicLoaded = false;

	var messagesMain;

	var sendMessageFunction = function () {
		var text, messageid;
		step(function () {
			text = $("#messageInput").val();

			var receiverIDs = [];
			var i;
			for (i = 0; i < receiver.length; i += 1) {
				receiverIDs.push(receiver[i].getUserID());
			}
			
			if (h.isset(topic)) {
				messages.sendMessage(text, undefined, topic, this);
			} else if (h.isset(receiver)) {
				messages.sendMessage(text, receiverIDs, undefined, this);
			}
		}, h.sF(function (data) {
			messageid = data.messageid;

			if (h.isInt(data.topicid) && parseInt(topic, 10) !==  parseInt(data.topicid, 10)) {
				messagesMain.loadTopic(data.topicid, this.last);
			} else {
				session.getOwnUser(this);
			}
		}), h.sF(function (u) {
			messagesMain.addMessageView(messageid, text, u, this);
		}), h.sF(function (ele) {
			$("#messageList").append(ele);
		}), function (err) {

		});
	};

	messagesMain = {
		load: function (done) {
			step(function () {
				messagesMain.sendMessageTo(this);
			}, h.sF(function () {
				messagesMain.loadMainTopics(this.parallel());
				messagesMain.loadTopic(display.getHash("topic"), this.parallel());
			}), done);

			$("#sendmessage").click(sendMessageFunction);

			//$('.scroll-pane').jScrollPane();
			done();
		},
		unload: function () {
			messagesMain.resetData();
		},
		resetData: function () {
			topic = receiver = topicObject = topicMessages = null;
			topicLoaded = false;
		},
		hashChange: function () {
			step(function () {
				messagesMain.sendMessageTo(this);
			}, h.sF(function () {
				messagesMain.loadTopic(display.getHash("topic"), this);
			}));
		},
		createReceiverHeader: function (done) {
			step(function () {
				var i;
				for (i = 0; i < receiver.length; i += 1) {
					receiver[i].getName(this.parallel());
				}
			}, h.sF(function (names) {
				names.join(", ");
				$("#messageTitle h2").text(names);

				if (!h.isset(topicObject)) {
					$("#messageTitle h2").append("<input type='text' placeholder='Add Receiver'/>");
				}

				this.ne();
			}), done);
		},
		sendMessageTo: function (done) {
			step(function () {
				if (h.isset(display.getHash("sendMessage"))) {
					if (h.isInt(display.getHash("sendMessage"))) {
						messages.getUserTopic(display.getHash("sendMessage"), this);
					} else {
						this.ne();
					}
				} else {
					this.last.ne();
				}
			}, h.sF(function (topic) {
				if (topic) {
					display.setHash("topic", topic.getID());
					this.last.ne();
				} else {
					display.removeHash("topic");
					messagesMain.resetData();
					var receiverIDs = display.getHash("sendMessage").split(",");

					var i;
					for (i = 0; i < receiverIDs.length; i += 1) {
						if (!h.isInt(receiverIDs[i])) {
							this.last.ne(false);
						}
					}

					userManager.loadUsers(receiverIDs, userManager.BASIC, this);
				}
			}), h.sF(function (user) {
				receiver = user;
				$("#messageList").html("Sende die erste Nachricht!");
				messagesMain.createReceiverHeader(this);
			}), done);
		},
		loadTopic: function (topicid, done) {
			step(function () {
				if (h.isInt(topicid)) {
					topicLoaded = false;
					$("#messageList").html("Loading!");
					display.setHash("topic", topicid);

					if (topic !== topicid) {
						topic = topicid;

						messages.getTopic(topicid, this);
					} else {
						this.last.ne();
					}
				} else {
					this.last.ne();
				}
			}, h.sF(function (topic) {
				topicObject = topic;
				receiver = topic.getReceiver();
				topic.getLatestMessages(this);
			}), h.sF(function (m) {
				topicMessages = m;
				messages.getMessagesTeReSe(m, this);
			}), h.sF(function (d) {
				var i;
				for (i = 0; i < topicMessages.length; i += 1) {
					messagesMain.addMessageView(d[i].m.getID(), d[i].t, d[i].s, this.parallel());
				}

				receiver = d[0].r;
			}), h.sF(function (eles) {
				var over = $("<div>");

				var i;
				for (i = 0; i < eles.length; i += 1) {
					over.append(eles[i]);
				}

				$("#messageList").html("");
				$("#messageList").append(over);

				messagesMain.createReceiverHeader(this);
			}), h.sF(function () {
				topicLoaded = true;
				this.ne();
			}), done);
		},
		addMessageView: function (messageid, text, sender, done) {
			step(function () {
				sender.getName(this);
			}, h.sF(function (name) {
				var messageHTML = '<li class="message"><div class="user"><img class="userimg" alt="Username" src="img/user.png"><span class="username">Svenja</span></div><div class="messageText"></div></li>';
				var ele = $(messageHTML);
				ele.find(".username").text(name);
				ele.find(".messageText").text(text);
				ele.find(".user").attr("name", "user" + sender.getUserID());
				ele.find(".user img").attr("name", "userImage" + sender.getUserID());

				ele.attr("id", "messageView" + messageid);
				if (sender.ownUser()) {
					ele.addClass("me");
				} else {
					ele.addClass("other");
				}

				this.ne(ele);
			}), done);
		},
		loadMainTopics: function (done) {
			var mym;
			step(function () {
				messages.getLatestTopics(this);
			}, h.sF(function (m) {
				mym = m;
				messages.getMessagesTeReSe(m, this);
			}), h.sF(function (d) {
				var i = 0;

				for (i = 0; i < mym.length; i += 1) {
					messagesMain.addTopicView(d[i].m.getTopicID(), d[i].t, d[i].r, this.parallel());
				}
			}), h.sF(function (eles) {
				var over = $("<div>");

				var i;
				for (i = 0; i < eles.length; i += 1) {
					over.append(eles[i]);
				}

				$("#topicListScroll").append(over);
			}), done);
		},
		addTopicView: function (topicid, text, receiver, done) {
			step(function () {
				var i;
				for (i = 0; i < receiver.length; i += 1) {
					receiver[i].getName(this.parallel());
				}
			}, h.sF(function (names) {
				var receiverNames = "";
				if (names.length === 1) {
					receiverNames = names[0];
				} else {
					receiverNames = names.join(", ");
				}

				var messageHTML = '<li class="topic"><div class="left"><img alt="Userimage" src="img/user.png" class="userimg"></div><div class="username"></div><div class="lastmessage"></div><div class="clear-fix"></div></li>';
				var ele = $(messageHTML);
				ele.find(".username").text(receiverNames);
				ele.find(".lastmessage").text(text);
				ele.find(".userimg img").attr("name", "userImage");
				ele.attr("id", "topicMain" + topicid);
				ele.click(function () {
					display.removeHash("sendMessage");
					display.setHash("topic", topicid);
				});

				this.ne(ele);
			}), done);

		}
//		addMessageView: function (text, receiver, sender) {

//		}
	};

	return messagesMain;
});