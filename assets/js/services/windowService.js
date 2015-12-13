define(["step", "whispeerHelper", "asset/observer", "services/serviceModule"], function (step, h, Observer, serviceModule) {
	"use strict";

	function service(localize, $state, $rootScope, settingsService, errorService) {
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
					var sound = settingsService.getBranch("sound");

					if (sound.enabled) {
						document.getElementById("sound").play();
					}
				}, errorService.criticalError);
			},
			createNotification: function (text, options, state, stateParams) {
				if (window.Notification && window.Notification.permission === "granted" && notificationCount < 5) {
					notificationCount += 1;
					var notification = new window.Notification(text, options);

					notification.onclick = function () {
						if (new Date().getTime() - lastTimeNotificationClick > 50) {
							$rootScope.$apply(function () {
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
						{topicid: obj.obj.getTopicID()});
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

	service.$inject = ["localize", "$state", "$rootScope", "ssn.settingsService", "ssn.errorService"];

	serviceModule.factory("ssn.windowService", service);
});
