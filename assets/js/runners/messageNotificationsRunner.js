const runnerModule = require("runners/runnerModule")
const windowService = require("services/windowService")
const titleService = require("services/titleService")
const messageService = require("messages/messageService").default
const localize = require("i18n/localizationConfig");

require("angularServices/notificationService");

runnerModule.run(["ssn.notificationService", function (notificationService) {
	"use strict";

	messageService.listen(function({ message, chat }) {
		if (!message.isOwn()) {
			if (!messageService.isActiveChat(chat.getID()) || !windowService.isVisible) {
				windowService.playMessageSound();
				notificationService.sendLocalNotification(message);
			}

			const title = localize.getLocalizedString("window.title.newmessage").replace("{data}", message.data.sender.basic.shortname)

			titleService.addTitle(title, chat.getID());

			chat.listen(() => {
				titleService.removeTitle(chat.getID())
			}, "read")
		}
	}, "message");
}]);
