import Cache from "./Cache";
import Storage from "./Storage";

export function checkLocalStorage() {
	try {
		localStorage.setItem("localStorageTest", "localStorageTest");
		localStorage.removeItem("localStorageTest");
		return true;
	} catch (e) {
		return false;
	}
}

const storages: Storage[] = [];

export const storageInfo = {
	Cache: new Cache("localStorage"),
	hasLocalStorage: checkLocalStorage(),
	broken: false
}

export function promoteMainWindow() {
	(<any>window).top.whispeerGetStorage = function (prefix: string) {
		return this.storages[prefix];
	};
}

export function withPrefix(prefix: string): Storage {
	if (!storages[prefix]) {
		try {
			storages[prefix] = new Storage(prefix);
		} catch(e) {
			storageInfo.broken = true;
		}
	}

	return storages[prefix];
}
