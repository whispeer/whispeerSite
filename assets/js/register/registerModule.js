define([
		"angular",
		"config",

		"i18n/localizationConfig",
		"localizationModule",
		"runners/promiseRunner",
	], function (angular, config) {
	"use strict";
	return angular.module("ssn.register", ["ssn.directives", "localization", "ssn.runners"],
		["$compileProvider", function ($compileProvider) {
			if (!config.debug) {
				$compileProvider.debugInfoEnabled(false);
			}
		}]
	);
});
