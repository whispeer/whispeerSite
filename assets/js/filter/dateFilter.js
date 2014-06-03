define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function dateFilter(localize, $interval) {
		$interval(function () {}, 60*1000);
		return function (input) {
			if (input) {
				var date = new Date(h.parseDecimal(input));
				var diff = new Date().getTime() - date.getTime();

				var ONEHOUR = 60*60*1000;
				var ONEMINUTE = 60*1000;

				var minutes = Math.floor(diff%ONEHOUR/ONEMINUTE);

				if (new Date(date).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {
					if (diff < ONEMINUTE) {
						return localize.getLocalizedString("date.time.justNow");
					} else if (diff < 2*ONEMINUTE) {
						return localize.getLocalizedString("date.time.oneMinuteAgo");
					} else if (diff < ONEHOUR) {
						return localize.getLocalizedString("date.time.minutesAgo", {
							minutes: minutes
						});
					} else if (diff < 2*ONEHOUR) {
						return localize.getLocalizedString("date.time.oneHourAgo", {
							minutes: minutes
						});
					} else {
						return localize.getLocalizedString("date.time.hoursAgo", {
							hours: Math.floor(diff/ONEHOUR),
							minutes: minutes
						});
					}
				}

				return date.toLocaleDateString() + " " + date.toLocaleTimeString();
			} else {
				return "";
			}
		};
	}

	dateFilter.$inject = ["localize", "$interval"];

	return dateFilter;
});