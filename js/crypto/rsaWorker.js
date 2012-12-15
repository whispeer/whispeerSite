importScripts("../libs/require.js");

require.wrap({baseUrl: "../"}, ["crypto/rsa", "libs/sjcl", "crypto/waitForReady", "crypto/jsbn", "crypto/jsbn2"], function (err, RSA, sjcl, waitForReady, BigInteger) {
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

		if (!waitForReady(function () {
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
					d = new BigInteger(event.data.d, 16);
					p = new BigInteger(event.data.p, 16);
					q = new BigInteger(event.data.q, 16);
					u = new BigInteger(event.data.u, 16);
					n = new BigInteger(event.data.n, 16);

					result = rsa.signPSS(m, d, p, q, u, n);
				} else if (event.data.verify) {
					//hash
					h = event.data.h;
					//signature
					s = new BigInteger(event.data.s, 16);

					//public key data
					ee = new BigInteger(event.data.ee, 16);
					n = new BigInteger(event.data.n, 16);

					result = rsa.verifyPSS(h, s, ee, n);
				} else if (event.data.encrypt) {
					//message
					m = event.data.m;

					//public key data
					ee = new BigInteger(event.data.ee, 16);
					n = new BigInteger(event.data.n, 16);

					//label
					l = event.data.l;

					result = rsa.encryptOAEP(m, ee, n, l);
				} else if (event.data.decrypt) {
					//coded message
					c = event.data.c;

					//private key data
					d = new BigInteger(event.data.d, 16);
					p = new BigInteger(event.data.p, 16);
					q = new BigInteger(event.data.q, 16);
					u = new BigInteger(event.data.u, 16);
					n = new BigInteger(event.data.n, 16);

					//label
					l = event.data.l;

					result = rsa.decryptOAEP(c, d, p, q, u, n, l);
				}

				if (result instanceof BigInteger) {
					result = result.toString(16);
				}

				self.postMessage(result);
			})) {
			throw new Error("Entropy should be first message!");
		}
	};

	self.postMessage("ready");
});