define(["libs/sjcl", "cryptoWorker/minimalHelper"], function (sjcl, chelper) {
	"use strict";

	function transformSymData(data) {
		if (!data.key || !data.message) {
			throw new Error("need message and key!");
		}

		data.key = chelper.hex2bits(data.key);

		if (typeof data.message !== "string") {
			data.message = sjcl.json.encode(data.message);
		}
	}

	function handleSym(data) {
		transformSymData(data);

		var func;

		if (data.encrypt) {
			func = sjcl.encrypt;
		} else {
			func = sjcl.decrypt;
		}

		if (data.iv === undefined) {
			return func(data.key, data.message);
		} else {
			return func(data.key, data.message, {"iv": data.iv});
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
			var x =	data.curve.field(data.point.x);
			var y = data.curve.field(data.point.y);
			data.point = new sjcl.ecc.point(data.curve, x, y);
		}
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

	return function (event) {
		if (event.data.randomNumber) {
			sjcl.random.addEntropy(event.data.randomNumber, event.data.entropy, "adding entropy");
			return "entropy";
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

		return result;
	};
});