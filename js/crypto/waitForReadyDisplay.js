define(['crypto/waitForReady', 'display', 'libs/step'], function (waitForReady, display, step) {
	"use strict";

	var added = false;

	return function (callback) {
		step(function wait() {
			if (!waitForReady(this)) {
				if (!added) {
					added = true;
					display.showNotReadyWarning();
				}
			}
		}, function ready(err) {
			if (err) {
				throw err;
			}

			if (added) {
				display.hideNotReadyWarning();
			}

			this();
		}, callback);
	};
});