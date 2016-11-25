define(["angular", "config", "config/localizationConfig", "directives/savebutton", "directives/mobile", "directives/loadVal", "directives/isIframe", "localizationModule", "runners/promiseRunner"], function (angular, config) {
	"use strict";
	return angular.module("ssn.login", ["ssn.services", "ssn.directives", "ssn.locale.config", "localization", "ssn.runners"],
		["$compileProvider", function ($compileProvider) {
			if (!config.debug) {
				$compileProvider.debugInfoEnabled(false);
			}
		}]
	);
});
