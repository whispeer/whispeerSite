define(["libs/sjcl"], function (sjcl) {
	"use strict";
	var helper = {
		getCurveName: function (curve) {
			var curcurve;
			for (curcurve in sjcl.ecc.curves) {
				if (sjcl.ecc.curves.hasOwnProperty(curcurve)) {
					if (sjcl.ecc.curves[curcurve] == curve) {
						return curcurve;
					}
				}
			}
		},
		getCurve: function (curveName) {
			if (sjcl.ecc.curves[curveName]) {
				return sjcl.ecc.curves[curveName];
			}

			throw "invalidCurve";
		},
		hex2bits: function (t) {
			if (t instanceof Array) {
				return t;
			}

			return sjcl.codec.hex.toBits(t);
		},
		bits2hex: function (t) {
			if (typeof t === "string") {
				return t;
			}

			return sjcl.codec.hex.fromBits(t);
		}
	};

	return helper;
});