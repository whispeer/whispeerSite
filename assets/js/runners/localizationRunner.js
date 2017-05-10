/**
* SessionService
**/

var settingsService = require("services/settings.service").default;
var localize = require("i18n/localizationConfig");

define(["runners/runnerModule", "bluebird"], function (runnerModule, Bluebird) {
	"use strict";

	runnerModule.run(["$rootScope", "$state", function ($rootScope, $state) {
		var firstStateChange = new Bluebird(function (resolve) {
			$rootScope.$on("$stateChangeSuccess", resolve);
		});

		$rootScope.$on("localizeResourcesUpdates", function () {
			firstStateChange.then(function () {
				$state.go($state.current, { locale: localize.getLanguage() });
			});
		});

		settingsService.setDefaultLanguage(localize.getLanguage());

		settingsService.listen(function () {
			var language = settingsService.getBranch("uiLanguage");

			if (language) {
				localize.setLanguage(language);
			}
		}, "loaded");
	}]);
});
