"use strict";

importScripts("jsbn.js", "jsbn2.js");

self.onmessage = function (event) {
	var number = new BigInteger(event.data.number, 16);
	var length = parseInt(event.data.length, 10);

	number.makePrime(length, 10);

	self.postMessage(number.toString(16));
};