import Observer from "../asset/observer";
import localizationLoader from "./localization.loader";
import * as Bluebird from "bluebird"

export default class Localize extends Observer {
	dictionary: any = {}
	dictionaryExtensions = []
	resourceFileLoaded = false
	onloadedCallback: () => void
	loadedPromise: Bluebird<void>

	language = window.navigator.language;

	constructor(baseLanguage?: string) {
		super();

		if (baseLanguage) {
			this.language = baseLanguage;
		}

		this.loadedPromise = new Bluebird<void>((resolve) => {
			this.onloadedCallback = resolve
		})

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

	private extend = (dictionary) => {
		this.dictionaryExtensions.push(dictionary)

		this.notify(this.language, "localizeResourcesUpdates");
	}

	loadOptionalLocaleExtension = (location) =>
		this.loadedPromise
			.then(() => localizationLoader.loadOptionalLocaleExtension(location))
			.then((dictionary) => this.extend(dictionary))

	// loads the language resource file from the server
	initLocalizedResources = () => {
		this.resourceFileLoaded = false;

		localizationLoader.loadLanguage(this.language).then((dict: any) => {
			this.dictionary = dict;
			this.resourceFileLoaded = true;

			this.notify(this.language, "localizeResourcesUpdates");
			this.onloadedCallback()
		});
	}

	getLanguage = () => localizationLoader.loadedLanguage || this.language

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

	getDictionaryValue = (value) : string => {
		const keys = value.split(".")

		return [this.dictionary].concat(this.dictionaryExtensions).reverse().map((dictionary) => {
			return keys
				.reduce((prev, attr) => prev[attr] ? prev[attr] : prev, dictionary);
		}).find((val) => typeof val === "string")
	}

	// checks the dictionary for a localized resource string
	getLocalizedString = (value: string, replacements: any) => {
		if (!this.resourceFileLoaded) {
			return "";
		}

		const entry : string = this.getDictionaryValue(value)

		if (typeof entry === "undefined" || typeof entry === "object") {
			return Localize.invalidTranslation(value);
		}

		if (!replacements) {
			return entry
		}

		return Object.keys(replacements).reduce((prev, element: string) => {
			return prev.replace(Localize.getFullReplacer(element), replacements[element]);
		}, entry)
	}
}
