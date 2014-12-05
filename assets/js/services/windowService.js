define(["step", "whispeerHelper", "asset/observer"], function (step, h, Observer) {
	"use strict";

	function service(localize, $location, $rootScope, settingsService, errorService) {
		var advancedTitle = {}, count = 0, topicInternalCount = 0;

		function cycleTitle() {
			var titles = Object.keys(advancedTitle);

			if (count >= titles.length) {
				count = 0;
				document.title = localize.getLocalizedString("window.title.basic");
			} else {
				var data = advancedTitle[titles[count]];
				document.title = localize.getLocalizedString("window.title." + titles[count]).replace("{data}", data[topicInternalCount]);

				topicInternalCount += 1;

				if (topicInternalCount >= data.length) {
					count += 1;
					topicInternalCount = 0;
				}
			}
		}

		window.setInterval(cycleTitle, 3000);

		var notificationCount = 0, lastTimeNotificationClick = 0;

		var api = {
			isVisible: true,
			isActive: true,
			setAdvancedTitle: function (topic, data) {
				advancedTitle[topic] = advancedTitle[topic] || [];

				if (advancedTitle[topic].indexOf(data) === -1) {
					advancedTitle[topic].push(data);
					cycleTitle();
				}
			},
			removeAdvancedTitle: function (topic) {
				delete advancedTitle[topic];
				cycleTitle();
			},
			playMessageSound: function () {
				step(function () {
					settingsService.getBranch("sound", this);
				}, h.sF(function (sound) {
					if (!sound || sound.active) {
						document.getElementById("sound").play();
					}
				}), errorService.criticalError);
			},
			createNotification: function (text, options, path, search) {
				if (window.Notification && window.Notification.permission === "granted" && notificationCount < 5) {
					notificationCount += 1;
					var notification = new window.Notification(text, options);

					notification.onclick = function () {
						if (new Date().getTime() - lastTimeNotificationClick > 50) {
							$rootScope.$apply(function () {
								$location.path(path).search(search);
							});
						}

						this.close();
					};

					notification.onclose = function () {
						notificationCount -= 1;
					};

					return notification;
				}
			},
			sendLocalNotification: function(type, obj) {
				if (type === "message") {
					return api.createNotification(localize.getLocalizedString("notification.newmessage").replace("{user}", obj.sender.name),
						{
							"body": obj.sender.basic.shortname + ": " + obj.text,
							"tag":	obj.timestamp,
							"icon":	obj.sender.basic.image
						}, "/messages", {topicid: obj.obj.getTopicID()});
				}		
			}
		};

		Observer.call(api);
		
		// get Permissions for Notifications
		if (window.Notification && window.Notification.permission === "default") {
			window.Notification.requestPermission();
		}

		var hidden = "hidden";

		function onchange(evt) {
			var v = true, h = false,
				evtMap = {
					focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
				};

			evt = evt || window.event;
			if (evt.type in evtMap) {
				setVisible(evtMap[evt.type]);
			} else {
				setVisible(evt.currentTarget[hidden] ? h : v);
			}
		}

		// Standards:
		if (hidden in document) {
			document.addEventListener("visibilitychange", onchange);
		} else if ((hidden = "mozHidden") in document) {
			document.addEventListener("mozvisibilitychange", onchange);
		} else if ((hidden = "webkitHidden") in document) {
			document.addEventListener("webkitvisibilitychange", onchange);
		} else if ((hidden = "msHidden") in document) {
			document.addEventListener("msvisibilitychange", onchange);
		} else {
			window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;
		}

		function setVisible(visible) {
			if (visible !== api.isVisible) {
				api.isVisible = visible;

				api.notify(visible, "visibilitychange");

				if (visible) {
					api.notify(visible, "visible");
				} else {
					api.notify(visible, "hidden");
				}
			}

			api.isActive = visible;
		}

		return api;
	}

	service.$inject = ["localize", "$location", "$rootScope", "ssn.settingsService", "ssn.errorService"];

	return service;
});