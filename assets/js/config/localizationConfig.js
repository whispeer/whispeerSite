define(["config/localizationConfigModule", "whispeerHelper"], function (module, h) {
	"use strict";

	return module.config(["localizationLoaderProvider", "localizeProvider", function (localizationLoaderProvider, localizeProvider) {
		var availableLanguages = ["en", "de"];

		localizationLoaderProvider.setAvailableLanguages(availableLanguages);
		localizationLoaderProvider.setFallBackLanguage(availableLanguages[0]);

		var lang = h.getLanguageFromPath();
		if (availableLanguages.indexOf(lang) > -1) {
			localizeProvider.setBaseLanguage(lang);
		}
	}]);
});
