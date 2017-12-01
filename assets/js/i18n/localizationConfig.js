const localizationLoader = require("./localization.loader").default;
const h = require("whispeerHelper").default;
const Localize = require("./localize").default;
const withPrefix = require("../services/storage.service").withPrefix

const availableLanguages = ["en", "de"];

localizationLoader.setAvailableLanguages(availableLanguages);
localizationLoader.setFallBackLanguage(availableLanguages[0]);

const lang = h.getLanguageFromPath();
const pathLanguageAvailable = availableLanguages.indexOf(lang) > -1;

const localize = new Localize(pathLanguageAvailable ? lang : null);

if (WHISPEER_BUSINESS) {
	localize.loadOptionalLocaleExtension("assets/js/i18n/l_business_")

	const companyID = withPrefix("whispeer.token").get("companyID")

	if (companyID) {
		localize.loadOptionalLocaleExtension(`assets/js/i18n/companies/l_${companyID}_`)
	}
}

module.exports = localize;
