importScripts("../libs/require.js");

require.wrap({baseUrl: "../"}, ["crypto/rsa", "libs/sjcl", "crypto/waitForReady", "crypto/jsbn", "crypto/jsbn2"], function (err, RSA, sjcl, waitForReady, BigInteger) {
	"use strict";

	if (err) {
		throw err;
	}

	var rsa = new RSA();

	self.onmessage = function (event) {
		if (event.data.randomNumber) {
			sjcl.random.addEntropy(event.data.randomNumber, event.data.entropy, "adding entropy");
			if (sjcl.random.isReady()) {
				self.postMessage({
					type: "needData",
					done: "entropy"
				});
			} else {
				self.postMessage({
					type: "needData",
					needed: "entropy"
				});
			}

			return;
		}

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

		if (event.data.decrypt) {
			self.postMessage({type: "log", d: "decrypting data"});
			//coded message
			c = new BigInteger(event.data.c, 16);

			//private key data
			d = new BigInteger(event.data.d, 16);
			p = new BigInteger(event.data.p, 16);
			q = new BigInteger(event.data.q, 16);
			u = new BigInteger(event.data.u, 16);
			n = new BigInteger(event.data.n, 16);

			//label
			l = event.data.l;

			result = rsa.decryptOAEP(c, d, p, q, u, n, l);
			self.postMessage(result);
		} else if (event.data.verify) {
			//hash
			h = event.data.h;
			//signature
			s = new BigInteger(event.data.s, 16);

			//public key data
			ee = new BigInteger(event.data.ee, 16);
			n = new BigInteger(event.data.n, 16);

			result = rsa.verifyPSS(h, s, ee, n);
			self.postMessage(result);
		} else if (event.data.sign || event.data.encrypt) {
			var runner = function () {
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
				} else if (event.data.encrypt) {
					//message
					m = new BigInteger(event.data.m, 16);

					//public key data
					ee = new BigInteger(event.data.ee, 16);
					n = new BigInteger(event.data.n, 16);

					//label
					l = event.data.l;

					result = rsa.encryptOAEP(m, ee, n, l);
				} else if (event.data.decrypt) {
					//coded message
					c = new BigInteger(event.data.c, 16);

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
			};

			if (!waitForReady(runner)) {
				self.postMessage({
					type: "needData",
					needed: "entropy"
				});
			}
		}
	};

	self.postMessage("ready");
});