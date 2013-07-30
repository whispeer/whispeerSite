if (importScripts) {
	importScripts("../libs/require.js");
}

require.wrap({baseUrl: "../"}, ["libs/sjcl", "crypto/helper.js"], function (err, sjcl, chelper) {
	"use strict";
	if (err) {
		throw err;
	}

	function handleSym(data) {
		var result;
		var key = data.key;

		var message = data.message;
		var iv = data.iv;

		key = chelper.hex2bits(key);
		var encrypt = data.encrypt;

		if (typeof message !== "string") {
			message = JSON.stringify(message);
		}

		var func;

		if (encrypt) {
			func = sjcl.encrypt;
		} else {
			func = sjcl.decrypt;
		}

		if (iv === undefined) {
			result = func(key, message);
		} else {
			result = func(key, message, {"iv": iv});
		}

		return result;
	}

	function privKey(exponent, curve) {
		exponent = new sjcl.bn(exponent);
		return new sjcl.ecc.ecdsa.secretKey(curve, exponent);
	}

	function sign(exponent, curve, toSign) {
		var privateKey = privKey(exponent, curve);

		toSign = chelper.hex2bits(toSign);

		return privateKey.sign(toSign);
	}

	function unKem(exponent, curve, tag) {
		var privateKey = privKey(exponent, curve);

		tag = chelper.hex2bits(tag);

		return privateKey.unkem(tag);
	}

	function publicKey(x, y, curve) {
		x =	curve.field(x);
		y = curve.field(y);
		var point = new sjcl.ecc.point(curve, x, y);

		return new sjcl.ecc.ecdsa.publicKey(curve, point);
	}

	function verify(x, y, curve, hash, signature) {
		var pubKey = publicKey(x, y, curve);

		hash = chelper.hex2bits(hash);
		signature = chelper.hex2bits(signature);

		return pubKey.verify(hash, signature);
	}

	function kem(x, y, curve) {
		var pubKey = publicKey(x, y, curve);

		var keyData = pubKey.kem();
		return {
			key: chelper.bits2hex(keyData.key),
			tag: chelper.bits2hex(keyData.tag)
		};
	}

	function handleAsym(data) {
		var result;
		var generate = data.generate;
		if (generate) {
			var crypt = data.crypt;
			if (crypt) {
				sjcl.ecc.elGamal.generateKeys(data.curve);
			} else {
				sjcl.ecc.elGamal.generateKeys(data.curve);
			}
		} else {
			var action = data.action;
			var curve = chelper.getCurve(data.curve);

			if (action === "sign") {
				return sign(data.exponent, curve, data.toSign);
			}

			if (action === "decrypt") {
				return unKem(action, data.exponent, curve, data.tag);
			}

			if (action === "verify") {
				return verify(data.x, data.y, curve, data.hash, data.signature);
			}

			if (action === "kem") {
				return kem(data.x, data.y, curve);
			}
		}

		return result;
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
				result = handleAsym(event.data);
			} else {
				result = handleSym(event.data);
			}
		} catch (e) {
			result = false;
		}

		self.postMessage(result);
	};

	self.postMessage("ready");
});