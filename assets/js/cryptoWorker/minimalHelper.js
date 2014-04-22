define([], function () {
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

	return chelper;
});