"use strict";

var ssnH = ssn.helper;

ssn.display.messages.main = {
	topic: null,
	receiver: null,
	lastSender: 0,

	handleMessageSent: function (c) {
		if (typeof c === "object") {
			ssn.logger.log(ssn.display.messages.main.topic + "=" + c.topicid);
			if (parseInt(ssn.display.messages.main.topic, 10) !== parseInt(c.topicid, 10)) {
				ssn.display.setHash("topic", c.topicid);
			} else {
				ssn.session.getOwnUser(function (u) {
					ssn.display.messages.main.addMessageView(c.messageid, $("#theMessage").val(), u);
					$("#theMessage").val("");
				});
			}
		}
	},

	sendMessageFunc: function () {
		ssn.logger.log("send: " + $("#theMessage").val());
		ssn.logger.log(ssn.display.messages.main.topic);
		ssn.logger.log(ssn.display.messages.main.receiver);

		var message = $("#theMessage").val();

		if (ssn.display.messages.main.topic !== null) {
			ssn.messages.sendMessage(message, undefined, ssn.display.messages.main.topic, ssn.display.messages.main.handleMessageSent);
		} else if (ssn.display.messages.main.receiver !== null) {
			ssn.messages.sendMessage(message, ssn.display.messages.main.receiver, undefined, ssn.display.messages.main.handleMessageSent);
		}

		//TODO: display an error / prompt user to enter receivers.
	},

	load: function (done) {
		$("#sendMessageSubmit").val(ssn.translation.getValue("sendMessage")).click(ssn.display.messages.main.sendMessageFunc);
		$(".messageul").bind("mousewheel", function (ev, delta) {
			var scrollTop = $(this).scrollTop();
			$(this).scrollTop(scrollTop - Math.round(delta));
		});
		$("body").addClass("messageView");
		ssn.display.messages.main.doLoad();
		done();
	},

	hashChange: function (done) {
		ssn.display.messages.main.doLoad();
		done();
	},

	doLoad: function () {
		try {
			ssn.display.messages.main.hideAll();
			this.topic = null;
			this.receiver = null;
			this.lastSender = 0;


			if (ssnH.isset(ssn.display.getHash("topic"))) {
				ssn.display.messages.main.loadTopic(ssn.display.getHash("topic"));
			} else if (ssnH.isset(ssn.display.getHash("message"))) {
				ssn.display.messages.main.loadMessage(ssn.display.getHash("message"));
			} else if (ssnH.isset(ssn.display.getHash("sendMessage"))) {
				ssn.display.messages.main.sendMessage(ssn.display.getHash("sendMessage"));
			} else {
				ssn.display.messages.main.loadMain();
			}
		} catch (e) {
			ssn.logger.log(e);
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
				$("<p/>").addClass("right").text(ssn.translation.getValue("sendNewMessage"))
			)
		);

		$("#theMessage").val("");
	},

	loadTopic: function (topicid) {
		ssn.display.messages.main.topic = topicid;
		ssn.messages.getTopic(topicid, function (t) {
			ssn.display.messages.main.receiver = t.getReceiver();
			t.getLatestMessages(function (m) {
				ssn.messages.getMessagesTeReSe(m, function (d) {
					ssn.logger.log("adding messages: " + d.length);
					ssn.display.messages.main.lastSender = 0;

					$("#messagetitle h1").text("Nachricht!");
					$(".messageWrap").hide();
					var i = 0;
					for (i = 0; i < m.length; i += 1) {
						ssn.display.messages.main.addMessageView(m[i].getID(), d[i].t, d[i].s);
					}

					$(".messageWrap").show();
					ssn.display.messages.main.sendMessageView();
					$("#messageul").mCustomScrollbar();
				});
			});
		});
		ssn.display.messages.main.loadMain();
	},

	loadMessage: function (messageid) {
		ssn.messages.getMessage(messageid, function (m) {
			ssn.display.messages.main.loadTopic(m.getTopicID());
		});
	},

	sendMessageView: function () {
		$("#sendMessage").show();
		$("#theMessage").val("");
	},

	sendMessage: function (theReceiver) {
		var jsonReceiver = $.parseJSON(theReceiver);
		if (jsonReceiver !== null) {
			ssn.display.messages.main.receiver = jsonReceiver;
		} else {
			ssn.display.messages.main.receiver = theReceiver;
		}

		if (typeof ssn.display.messages.main.receiver === "string") {
			ssn.display.messages.main.receiver = [parseInt(ssn.display.messages.main.receiver, 10)];
		} else if (typeof ssn.display.messages.main.receiver === "number") {
			ssn.display.messages.main.receiver = [ssn.display.messages.main.receiver];
		}

		if (ssn.display.messages.main.receiver !== "undefined") {
			if (ssn.display.messages.main.receiver.length === 1) {
				ssn.messages.getUserTopic(ssn.display.messages.main.receiver[0], function (topic) {
					if (ssnH.isset(topic)) {
						ssn.display.setHash("topic", topic.getID());
					} else {
						ssn.display.messages.main.startNewTopic();
					}
				});
			} else {
				ssn.display.messages.main.startNewTopic();
			}
		}
	},

	startNewTopic: function () {
		ssn.userManager.loadUsers(ssn.display.messages.main.receiver, ssn.userManager.BASIC, function (u) {
			var names = "";
			var i = 0;
			for (i = 0; i < u.length; i += 1) {
				names = names + u[i].getName();
			}

			$(".messagetitle h1").text(ssn.translation.getValue("sendMessageTo", names));

			$("#sendMessage").show();
			$(".messagewrap").show();
		});
	},

	addMessageView: function (messageid, message, sender, date) {
		ssn.logger.log("adding:" + message);
		var i = 0, names = "";

		if (sender.getUserID() === ssn.display.messages.main.lastSender) {
			ssn.logger.log(ssn.display.messages.main.lastSender);

			var texts = $(".textwrap");

			texts.last().append(
				$("<p/>").text(message).attr("id", "messageView-" + messageid).addClass("messagetext")
			);
		} else {
			var senderDiv = $("<div/>");
			var senderImg = $("<div/>");
			senderDiv.append($("<a/>").addClass("name").attr("href", sender.getLink()).text(sender.getName()));
			senderImg.append($("<img/>").addClass("image").attr("src", "img/profil.jpg"));

			var element = $("<li/>").addClass("message").append(
				$("<div/>").append(senderImg).append(senderDiv)
			).append(
				$("<div/>").addClass("textwrap").append(
					$("<p/>").addClass("messagetext").text(message)
				)
			);
			$("#messageul").append(element);
		}

		ssn.display.messages.main.lastSender = sender.getUserID();
		$("#messageul").mCustomScrollbar("update");
	},

	/** display received messages */
	loadMain: function () {
		ssn.messages.getLatestTopics(function (m) {
			ssn.messages.getMessagesTeReSe(m, function (d) {
				var i = 0;
				for (i = 0; i < m.length; i += 1) {
					ssn.display.messages.main.addMainView(d[i].t, d[i].m.getTopicID(), d[i].r);
				}
			});
		});
	},

	addMainView: function (message, topicid, receiver) {
		var senderDiv = $("<p/>").addClass("name");

		var i = 0;
		for (i = 0; i < receiver.length; i += 1) {
			if (i < receiver.length - 1) {
				senderDiv.text(receiver[i].getName() + ", ");
			} else {
				senderDiv.text(receiver[i].getName());
			}
		}

		var element = $("<li/>").addClass("topic").append(
			$("<img/>").addClass("image").attr("src", "img/profil.jpg")
		).append(
			senderDiv
		).append(
			$("<p/>").addClass("lastmessage").text(message)
		);

		element.click(function () {
			window.location.href = "#view=messages&topic=" + topicid;
		});

		$("#topicul").append(element);
	},

	unload: function () {}
};