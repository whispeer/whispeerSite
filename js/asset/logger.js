define([], function () {
	"use strict";
	return {
		/** into which div do we put logging messages */
		logdivid: "logger",

		ALL: 0,
		NOTICE: 1,
		BASIC: 2,
		WARNING: 3,
		ERROR: 4,

		logLevel: 1,

		/** log an error */
		logError: function (toLog) {
			this.log(toLog);
		},
		/** log something
		* @param toLog what do we want to log
		* @author Nilos
		*/
		log: function (toLog, logLevel) {
			if (typeof logLevel === "undefined" || this.logLevel <= logLevel) {
				if (toLog === null) {
					console.trace();
				} else if (typeof toLog === "string" || typeof toLog === "number" || typeof toLog === "boolean") {
					try {
						console.log(toLog);
					} catch (e) {}
				} else if (typeof toLog === "object") {
					if (toLog instanceof Error) {
						try {
							console.log(toLog);
							console.trace();
						} catch (e2) {}
					} else {
						try {
							console.log(toLog);
							console.trace();
						} catch (e3) {}
					}
				}
			}
		},

		time: function (label) {
			if (console.time) {
				console.time(label);
			}
		},

		timeEnd: function (label) {
			if (console.timeEnd) {
				console.timeEnd(label);
			}
		}
	};
});