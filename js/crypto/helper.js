define(["libs/sjcl"], function (sjcl) {
	var helper = {
		getCurveName: function (curve) {
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
			return sjcl.codec.hex.toBits(t);
		},
		bits2hex: function (t) {
			return sjcl.codec.hex.fromBits(t);
		}
	};
	
	return helper;
});