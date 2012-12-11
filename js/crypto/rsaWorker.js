importScripts("../libs/require.js");

require.wrap({baseUrl: "../"}, ["crypto/rsa", "libs/sjcl", "crypto/waitForReady"], function (err, RSA, sjcl, waitForReady) {
	"use strict";

	if (err) {
		throw err;
	}

	self.onmessage = function (event) {
		if (event.data.randomNumber) {
			sjcl.random.addEntropy(event.data.randomNumber, event.data.entropy, "adding entropy");

			return;
		}

		waitForReady(function () {
			var rsa = new RSA();
			var result;

			//message / crypted text
			var m, c;
			//label
			var l;
			//public key data
			var n, ee;
			//private key data
			var d, p, q, u;

			//hash / signature
			var h, s;

			if (event.data.sign) {
				//message to sign
				m = event.data.m;

				//private key data
				d = event.data.d;
				p = event.data.p;
				q = event.data.q;
				u = event.data.u;
				n = event.data.n;

				rsa.signPSS(m, d, p, q, u, n);
			} else if (event.data.verify) {
				//hash
				h = event.data.h;
				//signature
				s = event.data.s;

				//public key data
				ee = event.data.ee;
				n = event.data.n;

				rsa.verifyPSS(h, s, ee, n);
			} else if (event.data.encrypt) {
				//message
				m = event.data.m;

				//public key data
				ee = event.data.ee;
				n = event.data.n;

				//label
				l = event.data.l;

				result = rsa.encryptOAEP(m, ee, n, l);
			} else if (event.data.decrypt) {
				//coded message
				c = event.data.c;

				//private key data
				d = event.data.d;
				p = event.data.p;
				q = event.data.q;
				u = event.data.u;
				n = event.data.n;

				//label
				l = event.data.l;

				result = rsa.decryptOAEP(c, d, p, q, u, n, l);
			}

			self.postMessage({result: result});
		});
	};

	self.postMessage("ready");
});