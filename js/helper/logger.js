"use strict";

define(['jquery'], function (jQuery) {
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
					jQuery('<div/>', {
						text: toLog
					}).appendTo("#" + this.logdivid);
					try {
						console.log(toLog);
					} catch (e) {}
				} else if (typeof toLog === "object") {
					if (toLog instanceof Error) {
						jQuery('<div/>', {
							text: "Error: " + toLog.name + ": " + toLog.message,
							style: {
								color: "RED"
							}
						}).css("color", "red").appendTo("#" + this.logdivid);
						try {
							console.log(toLog);
							console.trace();
						} catch (e2) {}
					} else {
						jQuery('<div/>', {
							text: "Error: " + toLog.toString(),
							style: {
								color: "RED"
							}
						}).css("color", "red").appendTo("#" + this.logdivid);

						try {
							console.log(toLog);
							console.trace();
						} catch (e3) {}
					}
				}
			}
		},

		/** mark a new section in the logging 
		* @param theHeading text for new section
		* @author Nilos
		*/
		heading: function (theHeading) {
			if (typeof theHeading === "string" || typeof theHeading === "number" || typeof theHeading === "boolean") {
				jQuery('<div/>', {
					text: theHeading
				}).css("font-size", "30px").css("color", "red").appendTo("#" + this.logdivid);
			}
		}
	};
});