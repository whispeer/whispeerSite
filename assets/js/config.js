/* global module */

var buildDate = "2015429";
var environment = "development";

if (typeof define === "function") {
	define(["json!conf/" + environment + ".config.json"], function (config) {
		"use strict";

		config.buildDate = buildDate;

		return config;
	});
}
