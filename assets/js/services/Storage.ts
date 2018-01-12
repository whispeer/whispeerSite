import * as Bluebird from "bluebird"
import h from "../helper/helper"

const LOCALSTORAGE_ERROR_DE = "Fehler!\n Kann Daten nicht lokal speichern!\n whispeer funktioniert ohne lokale Datenspeicherung (localstorage) nicht.\n Bitte aktivier es oder bitte uns um Hilfe: feedback@whispeer.de"
const LOCALSTORAGE_ERROR_EN = "Error!\n Can't store data locally!\n whispeer does not work without localstorage.\n Please enable it or ask us for help: feedback@whispeer.de"

const checkLocalStorage = () => {
	const rand = Math.random()

	try {
		localStorage.setItem(`check-${rand}`, `check-${rand}`);
		if (localStorage.getItem(`check-${rand}`) === `check-${rand}`){
			localStorage.removeItem(`check-${rand}`)
			return true
		}

		return false
	} catch (e) {
		return false
	}
}

if (!checkLocalStorage) {
	if (h.getLanguageFromPath() === "de") {
		alert(LOCALSTORAGE_ERROR_DE)
	} else {
		alert(LOCALSTORAGE_ERROR_EN)
	}
}

export default class Storage {
	private _prefix: string

	constructor(prefix: string) {
		this._prefix = prefix
	}

	get = (key: string): any =>
		localStorage.getItem(this.calculateKey(key))

	set = (key: string, data: any) =>
		localStorage.setItem(this.calculateKey(key), data)

	remove = (key: string) =>
		localStorage.removeItem(this.calculateKey(key))

	clear = () => {
		const usedKeys = Object.keys(localStorage)
		usedKeys.filter(function (key) {
			return key.indexOf(this._prefix) === 0
		}, this).forEach(function (key) {
			localStorage.setItem(key, "")
		})

		return Bluebird.resolve()
	}

	save = () =>
		Bluebird.resolve()

	private calculateKey = (key: string) =>
		this._prefix + "." + key

	awaitLoading = () => Bluebird.resolve()
}
