define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function dateFilter(localize) {
		return function (input) {
			if (input) {
				var given = h.parseDecimal(input);
				var date = new Date(given);

				var time = date.toLocaleTimeString();
				debugger;
				if (new Date(date).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {
					if ((new Date().getHours() - new Date(date).getHours()) === 1) {
						return localize.getLocalizedString("date.time.oneHourAgo");
					} else if ((new Date().getHours() - new Date(date).getHours()) > 1) {
						return localize.getLocalizedString("date.time.hoursAgo").replace("{hours}", (new Date().getHours() - new Date(date).getHours()).toString());
					} else if ((new Date().getHours() - new Date(date).getHours()) === 0) {
						if ((new Date(date).getMinutes() < new Date().getMinutes())) {
							if ((new Date().getMinutes() - new Date(date).getMinutes()) === 1) {
								return localize.getLocalizedString("date.time.oneMinuteAgo");
							} else {
								return localize.getLocalizedString("date.time.minutesAgo").replace("{minutes}", (new Date().getMinutes() - new Date(date).getMinutes()).toString());
							}	
						} else {
							return localize.getLocalizedString("date.time.justNow");
						}
					}	
				}

				if (new Date(date).getFullYear() === new Date().getFullYear()) {

				}

				return date.toLocaleDateString() + " " + time;
			} else {
				return "";
			}
		};
	}

	dateFilter.$inject = ["localize"];

	return dateFilter;
});