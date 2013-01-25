define(["asset/logger"], function (logger) {
	"use strict";

	var listener = {};
	var doneListener = {};
	return {
		addDoneListener: function (func, topic) {
			if (typeof doneListener[topic] === "undefined") {
				doneListener[topic] = [];
			}

			if (doneListener[topic] === true) {
				func();
			} else {
				doneListener[topic].push(func);
			}
		},

		callDoneListener: function (topic) {
			if (typeof doneListener[topic] !== "undefined") {
				var i;
				for (i = 0; i < doneListener[topic].length; i += 1) {
					try {
						doneListener[topic][i]();
					} catch (e) {
						logger.log(e);
					}
				}
			}

			doneListener[topic] = true;
		},

		addListener: function (func, topic) {
			if (typeof listener[topic] === "undefined") {
				listener[topic] = [];
			}

			listener[topic].push(func);

			return listener[topic].length - 1;
		},

		removeListener: function (topic, id) {
			return listener[topic].splice(id, 1);
		},

		callListener: function (topic, message) {
			if (typeof listener[topic] !== "undefined") {
				var i;
				for (i = 0; i < listener[topic].length; i += 1) {
					try {
						listener[topic][i](message);
					} catch (e) {
						logger.log(e);
					}
				}
			}
		}
	};
});