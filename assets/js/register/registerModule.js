define([
		"angular",
		"config",

		"config/localizationConfig",
		"localizationModule"
	], function (angular, config) {
	"use strict";
	return angular.module("ssn.register", ["ssn.services", "ssn.directives", "ssn.locale.config", "localization"],
		["$compileProvider", function ($compileProvider) {
			if (!config.debug) {
				$compileProvider.debugInfoEnabled(false);
			}
		}]
	);
});
