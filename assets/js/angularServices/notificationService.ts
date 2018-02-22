"use strict";

import { Message } from "../messages/message"
import ChunkLoader from "../messages/chatChunk"

const serviceModule = require("./serviceModule");

function service(localize, $state, $rootScope) {
	var notificationCount = 0, lastTimeNotificationClick = 0;

	const win: any = window

	const api = {
		createNotification: function(text, options, state, stateParams) {
			if (win.Notification && win.Notification.permission === "granted" && notificationCount < 5) {
				notificationCount += 1;
				const notification = new win.Notification(text, options);

				notification.onclick = function() {
					if (new Date().getTime() - lastTimeNotificationClick > 50) {
						$state.go(state, stateParams)
						window.focus()

						$rootScope.$applyAsync()
					}

					this.close();
				};

				notification.onclose = function() {
					notificationCount -= 1;
				};

				window.setTimeout(function() {
					notification.close();
				}, 5 * 1000);

				return notification;
			}
		},
		sendLocalNotification: function(m: Message) {
			const sender = m.data.sender

			return api.createNotification(
				localize.getLocalizedString("notification.newmessage").replace("{user}", sender.name),
				{
					"body": sender.basic.shortname + ": " + m.getText(),
					"tag": m.getTime(),
					"icon": sender.basic.image
				},
				"app.messages.show",
				{ topicid: ChunkLoader.getLoaded(m.getChunkID()).getChatID() });
		}
	};

	// get Permissions for Notifications
	if (win.Notification && win.Notification.permission === "default") {
		win.Notification.requestPermission();
	}

	return api;
}

serviceModule.factory("ssn.notificationService", ["localize", "$state", "$rootScope", service]);
