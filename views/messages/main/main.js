define(["jquery", "asset/helper", "asset/logger", "display", "model/session", "model/messages", "asset/i18n!messages", "model/userManager"], function ($, h, logger, display, session, messages, i18n, userManager) {
	"use strict";
	var messagesMain = {
		topic: null,
		receiver: null,
		lastSender: 0,

		handleMessageSent: function (c) {
			if (typeof c === "object") {
				logger.log(messagesMain.topic + "=" + c.topicid);
				if (parseInt(messagesMain.topic, 10) !== parseInt(c.topicid, 10)) {
					display.setHash("topic", c.topicid);
				} else {
					session.getOwnUser(function (u) {
						messagesMain.addMessageView(c.messageid, $("#theMessage").val(), u);
						$("#theMessage").val("");
					});
				}
			}
		},

		sendMessageFunc: function () {
			logger.log("send: " + $("#theMessage").val());
			logger.log(messagesMain.topic);
			logger.log(messagesMain.receiver);

			var message = $("#theMessage").val();

			if (messagesMain.topic !== null) {
				messages.sendMessage(message, undefined, messagesMain.topic, messagesMain.handleMessageSent);
			} else if (messagesMain.receiver !== null) {
				messages.sendMessage(message, messagesMain.receiver, undefined, messagesMain.handleMessageSent);
			}

			//TODO: display an error / prompt user to enter receivers.
		},

		load: function (done) {
			$("#sendMessageSubmit").val(i18n.getValue("sendMessage")).click(messagesMain.sendMessageFunc);
			$(".messageul").bind("mousewheel", function (ev, delta) {
				var scrollTop = $(this).scrollTop();
				$(this).scrollTop(scrollTop - Math.round(delta));
			});
			$("body").addClass("messageView");
			messagesMain.doLoad();
			done();
		},

		hashChange: function (done) {
			messagesMain.doLoad();
			done();
		},

		doLoad: function () {
			try {
				messagesMain.hideAll();
				this.topic = null;
				this.receiver = null;
				this.lastSender = 0;


				if (h.isset(display.getHash("topic"))) {
					messagesMain.loadTopic(display.getHash("topic"));
				} else if (h.isset(display.getHash("message"))) {
					messagesMain.loadMessage(display.getHash("message"));
				} else if (h.isset(display.getHash("sendMessage"))) {
					messagesMain.sendMessage(display.getHash("sendMessage"));
				} else {
					messagesMain.loadMain();
				}
			} catch (e) {
				logger.log(e);
				throw e;
			}
		},

		hideAll: function () {
			//$("#sendMessage").hide();

			//$(".message").hide();
			$(".message").html("");

			//$("#mainView").hide();
			$("#mainView").html("");
			$("#topicul").html("");
			$("#messageul").html("");

			$("#topicul").append(
				$("<li/>").addClass("topic").attr("id", "newmessage").append(
					$("<p/>").addClass("left").text("+")
				).append(
					$("<p/>").addClass("right").text(i18n.getValue("sendNewMessage"))
				)
			);

			$("#theMessage").val("");
		},

		loadTopic: function (topicid) {
			messagesMain.topic = topicid;
			messages.getTopic(topicid, function (e, t) {
				messagesMain.receiver = t.getReceiver();
				t.getLatestMessages(function (e, m) {
					messages.getMessagesTeReSe(m, function (e, d) {
						logger.log("adding messages: " + d.length);
						messagesMain.lastSender = 0;

						$("#messageTitle h1").text("Nachricht!");
						$(".messageWrap").hide();
						var i = 0;
						for (i = 0; i < m.length; i += 1) {
							messagesMain.addMessageView(m[i].getID(), d[i].t, d[i].s);
						}

						$(".messageWrap").show();
						messagesMain.sendMessageView();
						$("#messageul").mCustomScrollbar();
					});
				});
			});
			messagesMain.loadMain();
		},

		loadMessage: function (messageid) {
			messages.getMessage(messageid, function (m) {
				messagesMain.loadTopic(m.getTopicID());
			});
		},

		sendMessageView: function () {
			$("#sendMessage").show();
			$("#theMessage").val("");
		},

		sendMessage: function (theReceiver) {
			var jsonReceiver = $.parseJSON(theReceiver);
			if (jsonReceiver !== null) {
				messagesMain.receiver = jsonReceiver;
			} else {
				messagesMain.receiver = theReceiver;
			}

			if (typeof messagesMain.receiver === "string") {
				messagesMain.receiver = [parseInt(messagesMain.receiver, 10)];
			} else if (typeof messagesMain.receiver === "number") {
				messagesMain.receiver = [messagesMain.receiver];
			}

			if (messagesMain.receiver !== "undefined") {
				if (messagesMain.receiver.length === 1) {
					messages.getUserTopic(messagesMain.receiver[0], function (e, topic) {
						if (h.isset(topic)) {
							display.setHash("topic", topic.getID());
						} else {
							messagesMain.startNewTopic();
						}
					});
				} else {
					messagesMain.startNewTopic();
				}
			}
		},

		startNewTopic: function () {
			userManager.loadUsers(messagesMain.receiver, userManager.BASIC, function (e, u) {
				var names = "";
				var i = 0;
				for (i = 0; i < u.length; i += 1) {
					names = names + u[i].getName();
				}

				$(".messageTitle h1").text(i18n.getValue("sendMessageTo", names));

				$("#sendMessage").show();
				$(".messageWrap").show();
			});
		},

		addMessageView: function (messageid, message, sender, date) {
			logger.log("adding:" + message);
			var i = 0, names = "";

			if (sender.getUserID() === messagesMain.lastSender) {
				logger.log(messagesMain.lastSender);

				var texts = $(".textWrap");

				texts.last().append(
					$("<p/>").text(message).attr("id", "messageView-" + messageid).addClass("messagetext")
				);
			} else {
				var senderDiv = $("<div/>");
				var senderImg = $("<div/>");
//				senderDiv.append($("<a/>").addClass("name").attr("href", sender.getLink()).text(sender.getName()));
				senderImg.append($("<img/>").addClass("image").attr("src", "img/profil.jpg"));

				var element = $("<li/>").addClass("message").append(
					$("<div/>").append(senderImg).append(senderDiv)
				).append(
					$("<div/>").addClass("textWrap").append(
						$("<p/>").addClass("messageText").text(message)
					)
				);
				$("#messageul").append(element);
			}

			messagesMain.lastSender = sender.getUserID();
			//$("#messageul").mCustomScrollbar("update");
		},

		/** display received messages */
		loadMain: function () {
			messages.getLatestTopics(function (e, m) {
				messages.getMessagesTeReSe(m, function (e, d) {
					var i = 0;
					for (i = 0; i < m.length; i += 1) {
						messagesMain.addMainView(d[i].t, d[i].m.getTopicID(), d[i].r);
					}
				});
			});
		},

		addMainView: function (message, topicid, receiver) {
			var senderDiv = $("<p/>").addClass("name");

			var i = 0;
			for (i = 0; i < receiver.length; i += 1) {
				if (i < receiver.length - 1) {
					//senderDiv.text(receiver[i].getName() + ", ");
				} else {
					//senderDiv.text(receiver[i].getName());
				}
			}

			var element = $("<li/>").addClass("topic").append(
				$("<img/>").addClass("image").attr("src", "img/profil.jpg")
			).append(
				senderDiv
			).append(
				$("<p/>").addClass("lastMessage").text(message)
			);

			element.click(function () {
				window.location.href = "#view=messages&topic=" + topicid;
			});

			$("#topicul").append(element);
		},

		unload: function () {
			$("body").removeClass("messageView");
		}
	};

	return messagesMain;
});