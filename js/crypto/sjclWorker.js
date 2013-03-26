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

		var asym = event.data.asym;

		var result;
		try {
			if (asym) {
				var generate = event.data.generate;
				if (generate) {
					var crypt = event.data.crypt;
					if (crypt) {
						sjcl.ecc.elGamal.generateKeys();
					} else {
						sjcl.ecc.elGamal.generateKeys();
					}
				} else {
					var action = event.data.action;
					if (action === "sign") {

					} else if (action === "verify") {

					} else if (action === "asymEncrypt") {

					} else if (action === "asymDecrypt") {

					}
				}
			} else {
				var key = event.data.key;

				var message = event.data.message;
				var iv = event.data.iv;

				key = sjcl.codec.hex.toBits(key);
				var encrypt = event.data.encrypt;

				if (typeof message !== "string") {
					message = JSON.stringify(message);
				}

				if (encrypt) {
					if (iv === undefined) {
						result = sjcl.encrypt(key, message);
					} else {
						result = sjcl.encrypt(key, message, {"iv": iv});
					}
				} else {
					if (iv === undefined) {
						result = sjcl.decrypt(key, message);
					} else {
						result = sjcl.decrypt(key, message, {"iv": iv});
					}
				}
			}
		} catch (e) {
			result = false;
		}

		self.postMessage(result);
	};

	self.postMessage("ready");
});