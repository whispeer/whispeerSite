define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function dateFilter(localize, $interval) {
		$interval(function () {}, 60*1000);
		return function (input) {
			if (input) {
				var given = h.parseDecimal(input);
				var date = new Date(given);

				var time = date.toLocaleTimeString();

				var now = new Date();

				if (new Date(date).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {
					if ((now.getHours() - date.getHours()) === 1) {
						return localize.getLocalizedString("date.time.oneHourAgo");
					} else if ((now.getHours() - date.getHours()) > 1) {
						return localize.getLocalizedString("date.time.hoursAgo").replace("{hours}", (now.getHours() - date.getHours()).toString());
					} else if ((now.getHours() - date.getHours()) === 0) {
						if ((date.getMinutes() < now.getMinutes())) {
							if ((now.getMinutes() - date.getMinutes()) === 1) {
								return localize.getLocalizedString("date.time.oneMinuteAgo");
							} else {
								return localize.getLocalizedString("date.time.minutesAgo").replace("{minutes}", (now.getMinutes() - date.getMinutes()).toString());
							}	
						} else {
							return localize.getLocalizedString("date.time.justNow");
						}
					}	
				}

				if (date.getFullYear() === new Date().getFullYear()) {

				}

				return date.toLocaleDateString() + " " + time;
			} else {
				return "";
			}
		};
	}

	dateFilter.$inject = ["localize", "$interval"];

	return dateFilter;
});