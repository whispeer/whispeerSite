var environment = "development";

if (typeof define === "function") {
	define(["json!conf/" + environment + ".config.json"], function (config) {
		"use strict";

		return config;
	});
}
