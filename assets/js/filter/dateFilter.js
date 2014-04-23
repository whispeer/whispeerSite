define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function dateFilter() {
		return function (input) {
			if (input) {
				var given = h.parseDecimal(input);
				var date = new Date(given);

				var time = date.toLocaleTimeString();

				if (new Date(date).setHours(0, 0, 0, 0) == new Date().setHours(0, 0, 0, 0)) {
					return time;
				}

				if (new Date(date).getFullYear() === new Date().getFullYear()) {

				}

				return date.toLocaleDateString() + " " + time;
			} else {
				return "";
			}
		};
	}

	dateFilter.$inject = [];

	return dateFilter;
});