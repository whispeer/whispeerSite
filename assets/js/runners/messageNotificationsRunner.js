var runnerModule = require("runners/runnerModule");
var windowService = require("services/windowService");
var titleService = require("services/titleService");

require("angularServices/notificationService");

var messageService = require("messages/messageService");

runnerModule.run(["ssn.notificationService", function (notificationService) {
	"use strict";
	// TODO CH

	/*messageService.listen(function(m) {
		if (!m.isOwn()) {
			if (!messageService.isActiveTopic(m.getTopicID()) || !windowService.isVisible) {
				windowService.playMessageSound();
				notificationService.sendLocalNotification("message", m.data);
			}

			titleService.setAdvancedTitle("newmessage", m.data.sender.basic.shortname);
		}
	}, "message");

	messageService.listen(function () {
		if (messageService.data.unread === 0) {
			titleService.removeAdvancedTitle("newmessage");
		}
	}, "updateUnread");*/
}]);
