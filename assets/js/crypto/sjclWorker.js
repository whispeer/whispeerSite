define(["libs/sjcl", "crypto/minimalHelper"], function (sjcl, chelper) {
	"use strict";

	function transformSymData(data) {
		if (!data.key || !data.message) {
			throw new Error("need message and key!");
		}

		data.key = chelper.hex2bits(data.key);
	}

	function handleSym(data) {
		transformSymData(data);

		var config = {};
		if (data.iv) {
			config.iv = data.iv;
		}

		if (data.encrypt) {
			return sjcl.json._encrypt(data.key, data.message, config);
		} else {
			config.raw = 1;
			return sjcl.json._decrypt(data.key, data.message, config);
		}
	}

	function privKey(exponent, curve) {
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

	function publicKey(point, curve) {
		return new sjcl.ecc.ecdsa.publicKey(curve, point);
	}

	function verify(point, curve, hash, signature) {
		var pubKey = publicKey(point, curve);

		hash = chelper.hex2bits(hash);
		signature = chelper.hex2bits(signature);

		return pubKey.verify(hash, signature);
	}

	function kem(point, curve) {
		var pubKey = publicKey(point, curve);

		var keyData = pubKey.kem();
		return {
			key: chelper.bits2hex(keyData.key),
			tag: chelper.bits2hex(keyData.tag)
		};
	}

	function transformAsymData(data) {
		if (data.curve) {
			data.curve = chelper.getCurve(data.curve);
		}

		if (data.exponent) {
			data.exponent = new sjcl.bn(data.exponent);
		}

		if (data.point) {
			var x =	new data.curve.field(data.point.x);
			var y = new data.curve.field(data.point.y);
			data.point = new sjcl.ecc.point(data.curve, x, y);
		}
	}

	function handleHash(data) {
		var text = data.toHash;

		var i, h = new sjcl.hash.sha256(), PART = 8 * 50;
		for (i = 0; i < text.length / PART; i+= 1) {
			h.update(sjcl.codec.base64.toBits(text.substr(i*PART, PART)));
		}

		return chelper.bits2hex(h.finalize());
	}

	function handleAsym(data) {
		transformAsymData(data);

		var curve = data.curve;

		if (data.generate) {
			var crypt = data.crypt;
			if (crypt) {
				sjcl.ecc.elGamal.generateKeys(curve);
			} else {
				sjcl.ecc.ecdsa.generateKeys(curve);
			}
		} else {
			var action = data.action;

			switch(action) {
				case "sign":
					return sign(data.exponent, curve, data.toSign);
				case "decrypt":
					return unKem(action, data.exponent, curve, data.tag);
				case "verify":
					return verify(data.point, curve, data.hash, data.signature);
				case "kem":
					return kem(data.point, curve);
			}
		}
	}

	return function (data) {
		if (data.randomNumber) {
			sjcl.random.addEntropy(data.randomNumber, data.entropy, "adding entropy");
			return "entropy";
		}

		var asym = data.asym;
		var isHash = data.isHash;

		if (isHash) {
			return handleHash(data);
		}

		if (asym) {
			return handleAsym(data);
		}

		return handleSym(data);
	};
});
