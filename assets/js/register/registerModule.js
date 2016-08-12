define([
		"angular",
		"config",

		"config/localizationConfig",
		"localizationModule"
	], function (angular) {
	"use strict";
	return angular.module("ssn.register", ["ssn.services", "ssn.directives", "ssn.locale.config", "localization"],
		["$compileProvider", function () {}, /*
			//This breaks production registration!
			function ($compileProvider) {
			if (!config.debug) {
				$compileProvider.debugInfoEnabled(false);
			}
		}*/]
	);
});
