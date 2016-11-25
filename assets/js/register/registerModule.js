define([
		"angular",
		"config",

		"config/localizationConfig",
		"localizationModule",
		"runners/promiseRunner",
	], function (angular, config) {
	"use strict";
	return angular.module("ssn.register", ["ssn.services", "ssn.directives", "ssn.locale.config", "localization", "ssn.runners"],
		["$compileProvider", function ($compileProvider) {
			if (!config.debug) {
				$compileProvider.debugInfoEnabled(false);
			}
		}]
	);
});
