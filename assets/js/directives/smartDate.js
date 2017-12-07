"use strict";
const h = require("whispeerHelper").default;
const directivesModule = require("directives/directivesModule");
var directive = function ($window, localize) {
	var ONEHOUR = 60*60*1000;
	var HALFHOUR = ONEHOUR / 2;
	var ONEMINUTE = 60*1000;

	function getDifferenceString(diff) {
		var minutes = Math.floor(diff%ONEHOUR/ONEMINUTE);

		if (diff < ONEMINUTE) {
			return localize.getLocalizedString("date.time.justNow");
		}

		if (diff < 2*ONEMINUTE) {
			return localize.getLocalizedString("date.time.oneMinuteAgo");
		}

		if (diff <= HALFHOUR) {
			return localize.getLocalizedString("date.time.minutesAgo", {
				minutes: minutes
			});
		}
	}

	function timestampDiffNow(timestamp) {
		return new Date().getTime() - timestamp;
	}

	const getLocalTime = (date) => {
		const time = date.toLocaleTimeString()
		const stripped = time.match(/^[^:]+(:\d\d){2} *(am|pm|)\b/i)

		if (stripped && stripped.length > 0) {
			return stripped[0]
		}

		return time
	}

	function toDateString(input, noDayDisplay) {
		if (input) {
			var date = new Date(h.parseDecimal(input));
			var diff = timestampDiffNow(h.parseDecimal(input));

			if (diff < HALFHOUR) {
				return getDifferenceString(diff);
			}

			if (noDayDisplay) {
				return getLocalTime(date);
			}

			return date.toLocaleDateString() + " " + getLocalTime(date);
		} else {
			return "";
		}
	}

	return {
		scope: {
			time: "=smartDate"
		},
		link: function (scope, element, attrs) {
			var previousResult;
			function updateDateString() {
				var result = toDateString(scope.time, attrs.smartDateNoDay !== undefined);

				if (result !== previousResult) {
					element.text(result);
				}

				previousResult = result;
			}

			updateDateString();

			scope.$watch(function () {
				return scope.time;
			}, updateDateString);

			var time = h.parseDecimal(scope.time);
			if (time > 999999) {
				var diff = timestampDiffNow(time);

				if (diff > HALFHOUR) {
					$window.setInterval(updateDateString, 24*60*60*1000);
				} else if (diff > ONEMINUTE) {
					$window.setInterval(updateDateString, 30*1000);
				} else {
					$window.setInterval(updateDateString, 1000);
				}
			}
		}
	};
};

directive.$inject = ["$window", "localize"];

directivesModule.directive("smartDate", directive);
