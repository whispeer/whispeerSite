const runnerModule = require("runners/runnerModule");
/* TODO CH const windowService = require("services/windowService");
const titleService = require("services/titleService");
const messageService = require("messages/messageService");*/

require("angularServices/notificationService");

runnerModule.run(["ssn.notificationService", function (/*notificationService*/) {
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
