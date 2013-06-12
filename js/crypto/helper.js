define(["libs/sjcl", "helper"], function (sjcl, h) {
	"use strict";
	var helper = {
		getCurveName: function (curve) {
			var curcurve;
			for (curcurve in sjcl.ecc.curves) {
				if (sjcl.ecc.curves.hasOwnProperty(curcurve)) {
					if (sjcl.ecc.curves[curcurve] === curve) {
						return curcurve;
					}
				}
			}

			throw "curve not existing";
		},
		getCurve: function (curveName) {
			if (typeof curveName !== "string" || curveName.substr(0, 1) !== "c") {
				curveName = "c" + curveName;
			}

			if (sjcl.ecc.curves[curveName]) {
				return sjcl.ecc.curves[curveName];
			}

			throw "invalidCurve";
		},
		hex2bits: function (t) {
			if (t instanceof Array) {
				return t;
			}

			if (h.isHex(t)) {
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
		},
		sjclPacket2Object: function (data) {
			var decoded = sjcl.json.decode(data);
			var result = {
				ct: decoded.ct,
				iv: decoded.iv
			};

			if (decoded.salt) {
				result.salt = decoded.salt;
			}

			
			return result;
		},
		Object2sjclPacket: function (data) {
			return sjcl.json.encode(data);
		},
	};

	return helper;
});