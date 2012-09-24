"use strict";

var ssnH = ssn.helper;

ssn.display.messages = {
	topic: null,
	receiver: null,
	lastSender: 0,

	handleMessageSent: function (c) {
		if (typeof c === "object") {
			ssn.logger.log(ssn.display.messages.topic + "=" + c.topicid);
			if (parseInt(ssn.display.messages.topic, 10) !== parseInt(c.topicid, 10)) {
				ssn.display.setHash("topic", c.topicid);
			} else {
				ssn.session.getOwnUser(function (u) {
					ssn.display.messages.addMessageView(c.messageid, $("#theMessage").val(), u);
					$("#theMessage").val("");
				});
			}
		}
	},

	sendMessageFunc: function () {
		ssn.logger.log("send: " + $("#theMessage").val());
		ssn.logger.log(ssn.display.messages.topic);
		ssn.logger.log(ssn.display.messages.receiver);

		var message = $("#theMessage").val();

		if (ssn.display.messages.topic !== null) {
			ssn.messages.sendMessage(message, undefined, ssn.display.messages.topic, ssn.display.messages.handleMessageSent);
		} else if (ssn.display.messages.receiver !== null) {
			ssn.messages.sendMessage(message, ssn.display.messages.receiver, undefined, ssn.display.messages.handleMessageSent);
		}

		//TODO: display an error / prompt user to enter receivers.
	},

	load: function () {
		$("#sendMessageSubmit").val(ssn.translation.getValue("sendMessage")).click(ssn.display.messages.sendMessageFunc);
		$("#messageView, .messages").bind("mousewheel", function (ev, delta) {
			var scrollTop = $(this).scrollTop();
			$(this).scrollTop(scrollTop - Math.round(delta));
		});

		ssn.display.messages.doLoad();
	},

	hashChange: function () {
		ssn.display.messages.doLoad();
	},

	doLoad: function () {
		try {
			ssn.display.messages.hideAll();
			this.topic = null;
			this.receiver = null;
			this.lastSender = 0;


			if (ssnH.isset(ssn.display.getHash("topic"))) {
				ssn.display.messages.loadTopic(ssn.display.getHash("topic"));
			} else if (ssnH.isset(ssn.display.getHash("message"))) {
				ssn.display.messages.loadMessage(ssn.display.getHash("message"));
			} else if (ssnH.isset(ssn.display.getHash("sendMessage"))) {
				ssn.display.messages.sendMessage(ssn.display.getHash("sendMessage"));
			} else {
				ssn.display.messages.loadMain();
			}
		} catch (e) {
			ssn.logger.log(e);
			throw e;
		}
	},

	hideAll: function () {
		$("#sendMessage").hide();

		$(".message").hide();
		$(".message").html("");

		$("#mainView").hide();
		$("#mainView").html("");

		$("#theMessage").val("");
	},

	loadTopic: function (topicid) {
		ssn.display.messages.topic = topicid;
		ssn.messages.getTopic(topicid, function (t) {
			ssn.display.messages.receiver = t.getReceiver();
			t.getLatestMessages(function (m) {
				ssn.messages.getMessagesTeReSe(m, function (d) {
					ssn.display.messages.lastSender = 0;

					$("#messagetitle h1").text("Nachricht!");
					$(".messageWrap").hide();
					var i = 0;
					for (i = 0; i < m.length; i += 1) {
						ssn.display.messages.addMessageView(m[i].getID(), d[i].t, d[i].s);
					}

					$(".messageWrap").show();
					ssn.display.messages.sendMessageView();
					$(".messageWrap").mCustomScrollbar();
				});
			});
		});
	},

	loadMessage: function (messageid) {
		ssn.messages.getMessage(messageid, function (m) {
			ssn.display.messages.loadTopic(m.getTopicID());
		});
	},

	sendMessageView: function () {
		$("#sendMessage").show();
		$("#theMessage").val("");
	},

	sendMessage: function (theReceiver) {
		var jsonReceiver = $.parseJSON(theReceiver);
		if (jsonReceiver !== null) {
			ssn.display.messages.receiver = jsonReceiver;
		} else {
			ssn.display.messages.receiver = theReceiver;
		}

		if (typeof ssn.display.messages.receiver === "string") {
			ssn.display.messages.receiver = [parseInt(ssn.display.messages.receiver, 10)];
		} else if (typeof ssn.display.messages.receiver === "number") {
			ssn.display.messages.receiver = [ssn.display.messages.receiver];
		}

		if (ssn.display.messages.receiver !== "undefined") {
			if (ssn.display.messages.receiver.length === 1) {
				ssn.messages.getUserTopic(ssn.display.messages.receiver[0], function (topic) {
					if (ssnH.isset(topic)) {
						ssn.display.setHash("topic", topic.getID());
					} else {
						ssn.display.messages.startNewTopic();
					}
				});
			} else {
				ssn.display.messages.startNewTopic();
			}
		}
	},

	startNewTopic: function () {
		ssn.userManager.loadUsers(ssn.display.messages.receiver, ssn.userManager.BASIC, function (u) {
			var names = "";
			var i = 0;
			for (i = 0; i < u.length; i += 1) {
				names = names + u[i].getName();
			}

			$(".messagetitle").text(ssn.translation.getValue("sendMessageTo", names));

			$("#sendMessage").show();
			$(".messagewrap").show();
		});
	},

	addMessageView: function (messageid, message, sender, date) {
		var i = 0, names = "";

		if (sender.getUserID() === ssn.display.messages.lastSender) {
			$(".messageul:last").append(
				$("<li/>").addClass("topic").text(message).attr("id", "messageView-" + messageid)
			);
		} else {
			var senderDiv = $("<div/>").addClass("msgsender");
			senderDiv.append($("<a/>").attr("href", sender.getLink()).text(sender.getName()));

			var element = $("<div/>").append(
				$("<div/>").addClass("userimg").append(
					$("<img/>").attr("src", "img/user.png")
				)
			).append(
				$("<div/>").addClass("messagewrap").append(
					senderDiv
				).append(
					$("<div/>").addClass("msgtext").text(message)
				)
			).append($("<br/>"));

			$("#messageView").append(element);
		}

		ssn.display.messages.lastSender = sender.getUserID();
		$("#messageView").mCustomScrollbar("update");
	},

	/** display received messages */
	loadMain: function () {
		ssn.messages.getLatestTopics(function (m) {
			ssn.messages.getMessagesTeReSe(m, function (d) {
				$("#mainView").show();
				var i = 0;
				for (i = 0; i < m.length; i += 1) {
					ssn.display.messages.addMainView(d[i].t, d[i].m.getTopicID(), d[i].r);
				}
			});
		});
	},

	addMainView: function (message, topicid, receiver) {
		var senderDiv = $("<div/>").addClass("msgsender");

		var i = 0;
		for (i = 0; i < receiver.length; i++) {
			if (i < receiver.length - 1) {
				senderDiv.append($("<a/>").attr("href", receiver[i].getLink()).text(receiver[i].getName() + ", "));
			} else {
				senderDiv.append($("<a/>").attr("href", receiver[i].getLink()).text(receiver[i].getName()));
			}
		}

		var element = $("<div/>").addClass("topicbox").append(
			$("<div/>").addClass("userimg").append(
				$("<img/>").attr("src", "img/user.png")
			)
		).append(
			$("<div/>").addClass("messagewrap").append(
				senderDiv
			).append(
				$("<div/>").addClass("msgtext").text(message)
			)
		).append($("<br/>"));

		element.click(function () {
			window.location.href = "#view=messages&topic=" + topicid;
		});

		$("#mainView").append(element);
	},

	unload: function () {}
};