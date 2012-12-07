define(['libs/sjcl', 'asset/logger', 'display'], function (sjcl, logger, display) {
	"use strict";

	/**
	* Wait until randomizer is ready.
	* calls callback if randomizer is ready.
	*/
	var waitForReady = function (callback) {
		if (sjcl.random.isReady()) {
			callback();
		} else {
			logger.log("Not yet ready!");
			display.showNotReadyWarning();
			sjcl.random.addEventListener("seeded", function () {
				display.hideNotReadyWarning();
				logger.log("Lets go!");

				callback();
			});
		}
	};

	return waitForReady;
});