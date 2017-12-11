var angular = require("angular")
var config = require("config");
require("i18n/localizationConfig");
require("directives/savebutton");
require("directives/mobile");
require("directives/loadVal");
require("localizationModule");

"use strict";
module.exports = angular.module("ssn.login", ["ngRaven", "ssn.directives", "ssn.runners"],
	["$compileProvider", function ($compileProvider) {
		if (!config.debug) {
			$compileProvider.debugInfoEnabled(false);
		}
	}]
);
