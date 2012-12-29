define(["jquery", "display", "libs/step", "model/messages", "asset/helper"], function ($, display, step, messages, h) {
	"use strict";

	var topic;
	var receiver;
	var topicObject;
	var topicMessages;
	var topicLoaded = false;

	var messagesMain = {
		load: function (done) {
			step(function () {
				messagesMain.loadMainTopics(this.parallel());
				messagesMain.loadTopic(display.getHash("topic"), this.parallel());
			}, done);

			//$('.scroll-pane').jScrollPane();
			done();
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
		loadTopic: function (topicid, done) {
			step(function () {
				topicLoaded = false;
				display.setHash("topic", topicid);

				if (topic !== topicid) {
					topic = topicid;

					messages.getTopic(topicid, this);
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
			}), h.sF(function (eles) {
				$("#messageList").html("");
				var over = $("<div>");

				var i;
				for (i = 0; i < eles.length; i += 1) {
					over.append(eles[i]);
				}

				$("#messageList").append(over);
			}), done);
		},
		unload: function (done) {
			done();
		},
		hashChange: function (done) {
			step(function () {
				messagesMain.loadTopic(display.getHash("topic"), this);
			}, done());
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