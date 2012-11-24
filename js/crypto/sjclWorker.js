"use strict";

importScripts("../libs/sjcl.js");

self.onmessage = function (event) {
	var key = event.data.key;

	var encrypt = event.data.encrypt;
	var message = event.data.message;

	var iv = event.data.iv;

	var result;
	if (encrypt) {
		if (typeof iv === "undefined") {
			result = sjcl.encrypt(sjcl.codec.hex.toBits(key), plainText);
		} else {
			result = sjcl.encrypt(sjcl.codec.hex.toBits(key), plainText, {"iv": iv});
		}
	} else {
		if (typeof iv === "undefined") {
			result = sjcl.decrypt(sjcl.codec.hex.toBits(key), encryptedText);
		} else {
			result = sjcl.decrypt(sjcl.codec.hex.toBits(key), encryptedText, {"iv": iv});
		}
	}

	var callback = event.data;
	callback.result = result;

	self.postMessage(result);
}