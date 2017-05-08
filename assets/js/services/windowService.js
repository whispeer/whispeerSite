var Bluebird = require("bluebird");
var Observer = require("asset/observer");

var settingsService = require("services/settings.service").default;
var errorService = require("services/error.service").errorServiceInstance;


var api = {
	isVisible: true,
	isActive: true,
	playMessageSound: function () {
		return Bluebird.try(function() {
			var sound = settingsService.getBranch("sound");

			if (sound.enabled) {
				document.getElementById("sound").play();
			}
		}).catch(errorService.criticalError);
	}
};

Observer.extend(api);

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

module.exports = api;
