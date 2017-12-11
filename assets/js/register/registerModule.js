"use strict";
const angular = require("angular");
const config = require("config");
require("i18n/localizationConfig");
require("localizationModule");
require("runners/promiseRunner");

module.exports = angular.module("ssn.register", ["ngRaven", "ssn.directives", "localization", "ssn.runners"],
	["$compileProvider", function ($compileProvider) {
		if (!config.debug) {
			$compileProvider.debugInfoEnabled(false);
		}
	}]
);
