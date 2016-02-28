var environment = typeof WHISPEER_ENV !== "undefined" ? WHISPEER_ENV : "development";

if (typeof define === "function") {
	define([
		"whispeerHelper",
		"json!conf/base.config.json",
		"json!conf/" + environment + ".config.json"
	], function (h, baseConfig, config) {
		"use strict";

		return h.extend(h.extend({}, baseConfig), config);
	});
}
