define(["libs/sjcl", "bluebird"], function (sjcl, Bluebird) {
	"use strict";

	/**
	* Wait until randomizer is ready.
	* calls callback if randomizer is ready.
	*/
	var waitForReady = function (callback) {
		if (sjcl.random.isReady()) {
			callback();
			return true;
		}

		waitForReady.waiting = true;

		sjcl.random.addEventListener("seeded", function () {
			waitForReady.waiting = false;
			waitForReady.ready = true;
			callback();
		});

		return false;
	};

	waitForReady.async = Bluebird.promisify(waitForReady);

	waitForReady.ready = false;
	waitForReady.waiting = false;

	return waitForReady;
});
