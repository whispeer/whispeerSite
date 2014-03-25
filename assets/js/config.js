var config = {
	https: false,
	ws: "127.0.0.1",
	wsPort: 3000
};

if (typeof module != "undefined" && module.exports) {
    module.exports = config;
}

if (typeof define === "function") {
    define([], function () {
		"use strict";
		return config;
    });
}