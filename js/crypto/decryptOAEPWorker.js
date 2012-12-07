importScripts("../libs/require.js");

require.wrap({baseUrl: "./"}, ["rsa", "../libs/sjcl", "waitForReady"], function (err, RSA, sjcl, waitForReady) {
	"use strict";

	if (err) {
		throw err;
	}

	self.onmessage = function (event) {
		if (event.randomNumber) {
			sjcl.random.addEntropy(event.randomNumber, event.entropy, "adding entropy");

			return;
		}

		waitForReady(function () {
			var c = event.data.c;
			var d = event.data.d;
			var p = event.data.p;
			var q = event.data.q;
			var u = event.data.u;
			var n = event.data.n;
			var l = event.data.l;

			var rsa = new RSA();

			rsa.decryptOAEP(c, d, p, q, u, n, l);

			self.postMessage();
		});
	};
});