if (typeof define === "function") {
	define([
		"whispeerHelper",
		"json!conf/base.config.json",
		"json!conf/" + WHISPEER_ENV + ".config.json"
	], function (h, baseConfig, config) {
		"use strict";

		return h.extend(h.extend({}, baseConfig), config);
	});
}
