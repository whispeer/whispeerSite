importScripts("../libs/require.js");

require.wrap({baseUrl: "../"}, ["libs/sjcl"], function (err, sjcl) {
	"use strict";
	if (err) {
		throw err;
	}

	self.onmessage = function (event) {
		if (event.data.randomNumber) {
			sjcl.random.addEntropy(event.data.randomNumber, event.data.entropy, "adding entropy");
			self.postMessage("entropy");
			return;
		}

		var key = event.data.key;

		var encrypt = event.data.encrypt;
		var message = event.data.message;

		var iv = event.data.iv;

		var key = sjcl.codec.hex.toBits(key);

		if (typeof message !== "string") {
			message = JSON.stringify(message);
		}

		var result;
		try {
			if (encrypt) {
				if (typeof iv === "undefined") {
					result = sjcl.encrypt(key, message);
				} else {
					result = sjcl.encrypt(key, message, {"iv": iv});
				}
			} else {
				if (typeof iv === "undefined") {
					result = sjcl.decrypt(key, message);
				} else {
					result = sjcl.decrypt(key, message, {"iv": iv});
				}
			}
		} catch (e) {
			result = false;
		}

		self.postMessage(result);
	};

	self.postMessage("ready");
});