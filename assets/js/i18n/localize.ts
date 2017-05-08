import Observer from "../asset/observer";
import localizationLoader from "./localization.loader";

export default class Localize extends Observer {
	dictionary: any = {}
	resourceFileLoaded = false

	language = window.navigator.language;

	constructor(baseLanguage?: string) {
		super();

		if (baseLanguage) {
			this.language = baseLanguage;
		}
	}

	static invalidTranslation = (value: string) => {
		console.warn("Invalid Translation:" + value);
		return "Missing Translation: " + value;
	}

	static getReplacementString = (replacer: string) => {
		return "{" + replacer + "}";
	};

	static escapeRegExp = (string: string) => {
		return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	}

	static regExpFromString = (string: string, mode?: string) => {
		return new RegExp(Localize.escapeRegExp(string), mode);
	}

	static getFullReplacer = (replacer: string) => {
		return Localize.regExpFromString(Localize.getReplacementString(replacer));
	}

	// loads the language resource file from the server
	initLocalizedResources = () => {
		this.resourceFileLoaded = false;

		localizationLoader.loadLanguage(this.language).then((dict: any) => {
			this.dictionary = dict;
			this.resourceFileLoaded = true;

			this.notify(this.language, "localizeResourcesUpdates");
		});
	}

	getLanguage = function () {
		return localizationLoader.loadedLanguage || this.language;
	};

	setLocales = function (_dictionary: any) {
		this.resourceFileLoaded = true;
		this.dictionary = _dictionary;
	};

	// allows setting of language on the fly
	setLanguage = function (value: string) {
		if (this.language !== value) {
			this.language = value;
			this.initLocalizedResources();
		}
	};

	parsePluralizationMatcher = function (pluralMatcher: string): boolean | { min: number, max: number} {
		var pluralPart = pluralMatcher.split(".."), min: number, max: number;

		if (pluralPart.length === 1) {
			min = parseInt(pluralPart[0], 10);
			max = min;
		} else if (pluralPart.length === 2) {
			min = parseInt(pluralPart[0], 10);
			max = parseInt(pluralPart[1], 10);
		}

		if (isNaN(min) && isNaN(max)) {
			return false;
		}

		if (isNaN(min)) {
			min = -Infinity;
		}

		if (isNaN(max)) {
			max = Infinity;
		}

		return { min: min, max: max };
	};

	matchesPluralization = function (pluralMatcher: string, count: number) {
		var parsed = this.parsePluralizationMatcher(pluralMatcher);
		return parsed && parsed.min <= count && parsed.max >= count;
	};

	tryPluralization = function (tag: Object, count: string) {
		var key: string, countInt: number;
		countInt = parseInt(count, 10);
		if (isNaN(countInt)) {
			return tag;
		}

		var plurals = this.dictionary.plurals;
		for (key in plurals) {
			if (plurals.hasOwnProperty(key) && this.matchesPluralization(key, count)) {
				return tag[plurals[key]];
			}
		}
	};

	// checks the dictionary for a localized resource string
	getLocalizedString = (value: string, replacements: any) => {
		if (!this.resourceFileLoaded) {
			return "";
		}

		var tag = value.split(".").reduce(function (previousValue, attr) {
			if (previousValue[attr]) {
				return previousValue[attr];
			}

			return previousValue;
		}, this.dictionary);

		if (typeof tag === "object") {
			tag = this.tryPluralization(tag, replacements.count);
		}

		if (typeof tag === "undefined" || typeof tag === "object") {
			return Localize.invalidTranslation(value);
		}

		if (replacements) {
			var element: string;
			for (element in replacements) {
				if (replacements.hasOwnProperty(element)) {
					tag = tag.replace(Localize.getFullReplacer(element), replacements[element]);
				}
			}
		}

		return tag;
	}
}
