var serviceModule = require("./serviceModule");

"use strict";

function service(localize, $state, $rootScope) {
	var notificationCount = 0, lastTimeNotificationClick = 0;

	var api = {
		createNotification: function (text, options, state, stateParams) {
			if (window.Notification && window.Notification.permission === "granted" && notificationCount < 5) {
				notificationCount += 1;
				var notification = new window.Notification(text, options);

				notification.onclick = function () {
					if (new Date().getTime() - lastTimeNotificationClick > 50) {
						$rootScope.$applyAsync(function () {
							$state.go(state, stateParams);
							window.focus();
						});
					}

					this.close();
				};

				notification.onclose = function () {
					notificationCount -= 1;
				};

				window.setTimeout(function () {
					notification.close();
				}, 5*1000);

				return notification;
			}
		},
		sendLocalNotification: function(type, obj) {
			if (type === "message") {
				return api.createNotification(
                    localize.getLocalizedString("notification.newmessage").replace("{user}", obj.sender.name),
					{
						"body": obj.sender.basic.shortname + ": " + obj.text,
						"tag":	obj.timestamp,
						"icon":	obj.sender.basic.image
					},
                    "app.messages.show",
                    {topicid: obj.obj.getChatID()});
			}
		}
	};

    // get Permissions for Notifications
	if (window.Notification && window.Notification.permission === "default") {
		window.Notification.requestPermission();
	}

	return api;
}

service.$inject = ["localize", "$state", "$rootScope"];

serviceModule.factory("ssn.notificationService", service);
