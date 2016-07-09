define(["angular", "config", "config/localizationConfig", "directives/savebutton", "directives/mobile", "directives/loadVal", "directives/isIframe", "localizationModule"], function (angular, config) {
	"use strict";
	return angular.module("ssn.login", ["ssn.services", "ssn.directives", "ssn.locale.config", "localization"],
		["$compileProvider", function ($compileProvider) {
			if (!config.debug) {
				$compileProvider.debugInfoEnabled(false);
			}
		}]
	);
});
