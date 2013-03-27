importScripts("../libs/require.js");

require.wrap({baseUrl: "../"}, ["libs/sjcl", "crypto/helper.js"], function (err, sjcl, chelper) {
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
					var curve = chelper.getCurve(event.data.curve);

					var exponent, privateKey;
					var x, y, point, publicKey;

					if (action === "sign" || action === "decrypt") {
						exponent = new sjcl.bn(event.data.exponent);
					} else {
						x =	curve.field(event.data.x);
						y = curve.field(event.data.y);
						point = new sjcl.ecc.point(curve, x, y);
					}

					if (action === "sign") {
						privateKey = new sjcl.ecc.ecdsa.secretKey(curve, exponent);
						var toSign = chelper.hex2bits(event.data.toSign);

						result = privateKey.sign(toSign);
					} else if (action === "verify") {
						publicKey = new sjcl.ecc.ecdsa.publicKey(curve, point);

						var hash = chelper.hex2bits(event.data.hash);
						var signature = chelper.hex2bits(event.data.signature);

						result = publicKey.verify(hash, signature);
					} else if (action === "unkem") {
						privateKey = new sjcl.ecc.elGamal.secretKey(curve, exponent);

						var tag = chelper.hex2bits(event.data.tag);

						result = privateKey.unkem(tag);
					} else if (action === "kem") {
						publicKey = new sjcl.ecc.elGamal.publicKey(curve, point);
						var data = publicKey.kem();
						result = {
							key: chelper.bits2hex(data.key),
							tag: chelper.bits2hex(data.tag)
						};
					}
				}
			} else {
				var key = event.data.key;

				var message = event.data.message;
				var iv = event.data.iv;

				key = chelper.hex2bits(key);
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