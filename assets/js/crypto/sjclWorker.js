if (importScripts) {
	importScripts("../libs/require.js");
}

requirejs.config({
	baseUrl: "/assets/js"
});

require(["libs/sjcl"], function (sjcl) {
	"use strict";

	var chelper = {
		getCurve: function (curveName) {
			if (typeof curveName !== "string" || curveName.substr(0, 1) !== "c") {
				curveName = "c" + curveName;
			}

			if (sjcl.ecc.curves[curveName]) {
				return sjcl.ecc.curves[curveName];
			}

			throw new Error("invalidCurve");
		},
		isHex: function (data) {
			return (data && typeof data === "string" && !!data.match(/^[A-Fa-f0-9]*$/));
		},
		hex2bits: function (t) {
			if (t instanceof Array) {
				return t;
			}

			if (chelper.isHex(t)) {
				return sjcl.codec.hex.toBits(t);
			}

			//TODO
			throw new InvalidHexError();
		},
		bits2hex: function (t) {
			if (typeof t === "string") {
				return t;
			}

			return sjcl.codec.hex.fromBits(t);
		}
	};

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