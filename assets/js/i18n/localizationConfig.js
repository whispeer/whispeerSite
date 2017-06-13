var localizationLoader = require("./localization.loader").default;
var h = require("whispeerHelper");
var Localize = require("./localize").default;

var availableLanguages = ["en", "de"];

localizationLoader.setAvailableLanguages(availableLanguages);
localizationLoader.setFallBackLanguage(availableLanguages[0]);

var lang = h.getLanguageFromPath();
var pathLanguageAvailable = availableLanguages.indexOf(lang) > -1;

var localize = new Localize(pathLanguageAvailable ? lang : null);

module.exports = localize;
