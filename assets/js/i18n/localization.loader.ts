import 'whatwg-fetch';

declare var WHISPEER_BUSINESS : boolean

class LocalizationLoader {
	fallBackLanguage: string = "en-US";
	location: string = (WHISPEER_BUSINESS ? "assets/js/i18n/l_business_" : "assets/js/i18n/l_");
	availableLanguages: string[] = [];
	loadedLanguage: string;

	private getLanguageUrl = (language: string) => {
		return this.location + language + ".json";
	}

	private updateLanguageOnFail = (language: string) => {
		if (language.length > 2) {
			return language.substr(0, 2);
		}

		return this.fallBackLanguage;
	}

	private retryOnFail = (language: string) => {
		var otherLanguage = this.updateLanguageOnFail(language);
		if (otherLanguage !== language) {
			return this.loadLanguage(otherLanguage);
		}

		throw new Error("no localization found!");
	}

	loadLanguage = (language: string): Promise<void> => {
		language = language.toLowerCase();

		if (this.availableLanguages.length > 0 && this.availableLanguages.indexOf(language) === -1) {
			return this.retryOnFail(language);
		}

		if (this.availableLanguages.indexOf(language) > -1) {
			this.loadedLanguage = language;
		}

		return fetch(this.getLanguageUrl(language)).then((response: any) => {
			return response.json();
		}).then((dictionary: any) => {
			this.loadedLanguage = language;
			return dictionary;
		}).catch(() => {
			this.retryOnFail(language);
		});
	};

	setFallBackLanguage =  (_fallBackLanguage: string) => {
		this.fallBackLanguage = _fallBackLanguage;
	}

	setAvailableLanguages =  (_availableLanguages: string[]) => {
		this.availableLanguages = _availableLanguages;
	}
}

export default new LocalizationLoader();
