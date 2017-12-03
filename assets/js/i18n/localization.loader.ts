import 'whatwg-fetch';

class LocalizationLoader {
	fallBackLanguage: string = "en-US";
	location: string = "assets/js/i18n/l_"
	availableLanguages: string[] = [];
	loadedLanguage: string;

	private getLanguageUrl = (location:string, language: string) =>
		`${location}${language}.json`

	private updateLanguageOnFail = (language: string) =>
		language.length > 2 ? language.substr(0, 2) : this.fallBackLanguage;

	private retryOnFail = (language: string) => {
		var otherLanguage = this.updateLanguageOnFail(language);
		if (otherLanguage !== language) {
			return this.loadLanguage(otherLanguage);
		}

		throw new Error("no localization found!");
	}

	loadOptionalLocaleExtension = (location: string) => {
		const url = this.getLanguageUrl(location, this.loadedLanguage)
		return fetch(url)
			.then((response) => response.json())
			.catch((e) => {
				console.warn(`Failed loading language file ${url}`, e)
				return {}
			})
	}

	loadLanguage = (language: string): Promise<void> => {
		language = language.toLowerCase();

		if (!this.fallBackLanguage || this.availableLanguages.length === 0) {
			throw new Error("Localization module not initialized correctly")
		}

		if (this.availableLanguages.indexOf(language) === -1) {
			return this.retryOnFail(language);
		}

		this.loadedLanguage = language;

		return fetch(this.getLanguageUrl(this.location, language))
			.then((response) => response.json())
	};

	setFallBackLanguage =  (_fallBackLanguage: string) =>
		this.fallBackLanguage = _fallBackLanguage;

	setAvailableLanguages =  (_availableLanguages: string[]) =>
		this.availableLanguages = _availableLanguages;
}

export default new LocalizationLoader();
