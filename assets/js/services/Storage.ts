import * as Bluebird from "bluebird";
import { storageInfo } from "./storage.service";

export default class Storage {
	private _prefix: string;
	private _loadingPromise: Bluebird<any>
	private _hasLocalStorage: boolean;
	private _localStorageData: Object;

	constructor(prefix: string) {
		this._prefix = prefix;
		this._hasLocalStorage = storageInfo.hasLocalStorage;

		if(this._hasLocalStorage) {
			this._loadingPromise = Bluebird.resolve();
		} else {
			this._localStorageData = {};
			this._loadingPromise = storageInfo.Cache.get(this._prefix).bind(this)
			.then((_localStorageData: any) => {
				if (_localStorageData) {
					this._localStorageData = _localStorageData.data;
				}
			}).catch((e: any) => {
				storageInfo.broken = true;
				console.warn(e);

				var getStorageFunction = (<any>window).top.whispeerGetStorage;

				if (getStorageFunction) {
					console.log("got storage function");
					var s = getStorageFunction(prefix);
					this._localStorageData = s._localStorageData;
				}
			});
		}
	}

	get(key: string): any {
		if(this._hasLocalStorage) {
			return localStorage.getItem(this._calculateKey(key));
		}

		return this._localStorageData[this._calculateKey(key)];
	}

	set(key: string, data: any) {
		if(this._hasLocalStorage) {
			localStorage.setItem(this._calculateKey(key), data);
		} else {
			this._localStorageData[this._calculateKey(key)] = "" + data;
		}
	}

	remove(key: string) {
		if(this._hasLocalStorage) {
			localStorage.removeItem(this._calculateKey(key));
		} else {
			delete this._localStorageData[this._calculateKey(key)];
		}
	}

	clear() {
		if(this._hasLocalStorage) {
			const usedKeys = Object.keys(localStorage);
			usedKeys.filter(function (key) {
				return key.indexOf(this._prefix) === 0;
			}, this).forEach(function (key) {
				localStorage.removeItem(key);
			});
		} else {
			const usedKeys = Object.keys(this._localStorageData);
			usedKeys.filter(function (key) {
				return key.indexOf(this._prefix) === 0;
			}, this).forEach(function (key) {
				delete this._localStorageData[key];
			}, this);
		}

		return this.save();
	}

	save(): Bluebird<any> {
		if(this._hasLocalStorage) {
			return Bluebird.resolve();
		}

		if (storageInfo.broken) {
			return Bluebird.resolve();
		}

		return storageInfo.Cache.store(this._prefix, this._localStorageData);
	}

	_calculateKey(key: string) {
		return this._prefix + "." + key;
	}

	awaitLoading() {
		return this._loadingPromise;
	}
}
