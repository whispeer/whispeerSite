import { errorServiceInstance } from "./error.service";
import * as Bluebird from "bluebird";
import Dexie from "dexie";
const h = require("../helper/helper.js");

var db: Dexie;

try {
	indexedDB.deleteDatabase("whispeer");
} catch (e) {}

try {
	db = new Dexie("whispeerCache");

	db.version(1).stores({
		cache: "id,created,used,type,size"
	});

	db.open();
} catch (e) {
	console.error(e);
	console.error("Dexie failed to initialize...");
}

export default class Cache {
	private _name: string;
	private _options: any;

	private _db: any; // Once open the db has attributes for tables which are not defined in the class.
	private _cacheDisabled: boolean = false;

	constructor(name : string, options?: any) {
		this._name = name;
		this._options = options || {};
		this._options.maxEntries = this._options.maxEntries || 100;
		this._options.maxBlobSize = this._options.maxBlobSize || 1*1024*1024;

		this._db = db;

		if (this._db) {
			this._db.on("blocked", errorServiceInstance.logError);
		} else {
			this.disable();
		}
	}

	entries() {
		if (this._cacheDisabled) {
			return Bluebird.resolve();
		}

		return this._db.cache.where("type").equals(this._name);
	}

	entryCount() : Bluebird<any> {
		if (this._cacheDisabled) {
			return Bluebird.reject("");
		}

		return Bluebird.resolve(this._db.cache.where("type").equals(this._name).count());
	}

	static sumSize (arr: any[]) {
		return arr.reduce(function (prev, cur) {
			return prev + cur.size;
		}, 0);
	}

	_fixBlobStorage(cacheEntry: any) {
		var blobToDataURI = Bluebird.promisify(h.blobToDataURI.bind(h));

		return Bluebird.resolve(cacheEntry.blobs)
			.map(blobToDataURI)
			.then((blobsAsUri) => {
				cacheEntry.blobs = blobsAsUri;
				return this._db.cache.add(cacheEntry);
			});
	}

	store(id: string, data: any, blobs?: any): Bluebird<any> {
		if (this._cacheDisabled) {
			return Bluebird.resolve();
		}

		if (blobs && !h.array.isArray(blobs)) {
			blobs = [blobs];
		}

		if (blobs && this._options.maxBlobSize !== -1 && Cache.sumSize(blobs) > this._options.maxBlobSize) {
			return Bluebird.resolve();
		}

		Bluebird.delay(0).bind(this).then(function () {
			return this.cleanUp();
		}).catch(errorServiceInstance.criticalError);

		var cacheEntry = {
			data: JSON.stringify(data),
			created: new Date().getTime(),
			used: new Date().getTime(),
			id: this._name + "/" + id,
			type: this._name,
			size: 0,
			blobs: <any>[]
		};

		if (blobs) {
			cacheEntry.blobs = blobs;
			cacheEntry.size = Cache.sumSize(blobs);
		}

		return Bluebird.resolve(
			this._db.cache.put(cacheEntry)
			.catch((e: any) => {
				console.warn(e);
				if (e.code && e.code === e.DATA_CLONE_ERR) {
					return this._fixBlobStorage(cacheEntry);
				} else {
					return Bluebird.reject(e);
				}
			})
		).catch(errorServiceInstance.criticalError);
	}

	get(id: string): Bluebird<any> {
		if (this._cacheDisabled) {
			return Bluebird.reject(new Error("Cache is disabled"));
		}

		var theCache = this;
		var cacheResult = this._db.cache.where("id").equals(this._name + "/" + id);

		this._db.cache.where("id").equals(this._name + "/" + id).modify({ used: new Date().getTime() });

		return Bluebird.resolve(cacheResult.first().then((data: any) => {
			if (typeof data !== "undefined") {
				data.data = JSON.parse(data.data);

				data.blobs = data.blobs || [];

				data.blobs = data.blobs.map((blob: any) => {
					if (typeof blob === "string") {
						return h.dataURItoBlob(blob);
					}

					return blob;
				});

				if (data.blobs.length === 1) {
					data.blob = data.blobs[0];
				}

				return data;
			}

			throw new Error("cache miss for " + theCache._name + "/" + id);
		}));
	}

	/**
	 * get all cache entries as a dexie collection.<
	 * @return {Bluebird<any>} Promise containing all cache entries as a dexie collection.
	 */
	all(): Bluebird<any> {
		if (this._cacheDisabled) {
			return Bluebird.resolve([]);
		}

		return this._db.cache.where("id").startsWith(this._name + "/");
	}

	/**
	 * delete a certain cache entry.
	 * @param  {string}        id id of the entry
	 * @return {Bluebird<any>}    [description]
	 */
	delete(id: string): Bluebird<any> {
		if (this._cacheDisabled) {
			return Bluebird.resolve();
		}

		return this._db.cache.where("id").equals(this._name + "/" + id).delete();
	}

	cleanUp() {
		if (this._cacheDisabled) {
			return Bluebird.resolve();
		}

		if (this._options.maxEntries === -1) {
			return;
		}

		//remove data which hasn't been used in a long time
		return Bluebird.resolve(
			this.entryCount().bind(this).then((count) => {
				console.log("Contains: " + count + " Entries (" + this._name + ")");
				if (count > this._options.maxEntries) {
					console.warn("cleaning up cache " + this._name);
					this._db.cache.orderBy("used").limit(count - this._options.maxEntries).delete();
				}
			})
		);
	};

	private disable() {
		this._cacheDisabled = true;
	}
}
