var environment = typeof WHISPEER_ENV !== "undefined" ? WHISPEER_ENV : "development";

if (typeof define === "function") {
	define(["json!conf/" + environment + ".config.json"], function (config) {
		"use strict";

		return config;
	});
}
