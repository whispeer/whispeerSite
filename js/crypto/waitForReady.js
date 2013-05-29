define(['libs/sjcl'], function (sjcl) {
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

		sjcl.random.addEventListener("seeded", function () {
			callback();
		});

		return false;
	};

	return waitForReady;
});