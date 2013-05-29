importScripts("../libs/require.js");

require.wrap({baseUrl: "../"}, ["crypto/jsbn", "crypto/jsbn2"], function (err, BigInteger) {
	"use strict";

	if (err) {
		throw err;
	}

	self.onmessage = function (event) {
		var number = new BigInteger(event.data.number, 16);
		var length = parseInt(event.data.length, 10);

		number.makePrime(length, 10);

		self.postMessage(number.toString(16));
	};

	self.postMessage("ready");
});