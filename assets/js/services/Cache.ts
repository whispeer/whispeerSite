import { errorServiceInstance } from "./error.service";
import * as Bluebird from "bluebird";
import h from "../helper/helper"
import idb, { Cursor } from "idb" // tslint:disable-line:no-unused-variable

const REINIT_CACHE_TIMEOUT = 2000
let cachesDisabled = false

const openDatabase = () =>
	idb.open("whispeerCache", 10, upgradeDB => {
		const objectStore = upgradeDB.createObjectStore('cache', { keyPath: "id" });

		objectStore.createIndex("created", "created", { unique: false });
		objectStore.createIndex("used", "used", { unique: false });
		objectStore.createIndex("type", "type", { unique: false });
		objectStore.createIndex("size", "size", { unique: false });
	}).catch((e) => {
		console.warn("Disabling indexedDB caching due to error", e)

		cachesDisabled = true

		return Promise.reject(e)
	})

const initCache = () => cachesDisabled = false

try {
	indexedDB.deleteDatabase("whispeer");
} catch (e) {}

const followCursorUntilDone = (cursorPromise: Promise<Cursor>, action) => {
	return Bluebird.try(async () => {
		let cursor = await cursorPromise

		while (cursor) {
			action(cursor)

			cursor = await cursor.continue()
		}
	})
}

export default class Cache {
	private options: any
	private cacheDisabled: boolean = false

	static deleteDatabase() {
		cachesDisabled = true

		return idb.delete("whispeerCache").then(() => {
			setTimeout(() => {
				initCache()
			}, REINIT_CACHE_TIMEOUT)
		})
	}

	constructor(private name : string, options?: any) {
		this.options = options || {};
		this.options.maxEntries = this.options.maxEntries || 100;
		this.options.maxBlobSize = this.options.maxBlobSize || 1*1024*1024;
	}

	static sumSize (arr: any[]) {
		return arr.reduce(function (prev, cur) {
			return prev + cur.size;
		}, 0);
	}

	store(id: string, data: any, blobs?: any): Bluebird<any> {
		if (this.isDisabled()) {
			return Bluebird.resolve();
		}

		if (blobs && !h.array.isArray(blobs)) {
			blobs = [blobs];
		}

		if (blobs && this.options.maxBlobSize !== -1 && Cache.sumSize(blobs) > this.options.maxBlobSize) {
			return Bluebird.resolve();
		}

		var cacheEntry = {
			data: JSON.stringify(data),
			created: new Date().getTime(),
			used: new Date().getTime(),
			id: this.getID(id),
			type: this.name,
			size: 0,
			blobs: <any>[]
		};

		if (blobs) {
			cacheEntry.blobs = blobs;
			cacheEntry.size = Cache.sumSize(blobs);
		}

		return Bluebird.try(async () => {
			const db = await openDatabase()

			console.info(`Storing in indexeddb ${this.getID(id)}`)

			const tx = db.transaction('cache', 'readwrite')
			tx.objectStore('cache').put(cacheEntry)

			await tx.complete
			db.close()
		}).catch(errorServiceInstance.criticalError);
	}

	contains(id: string): Bluebird<boolean> {
		if (this.isDisabled()) {
			return Bluebird.resolve(false)
		}

		return Bluebird.try(async () => {
			const db = await openDatabase()
			const tx = db.transaction("cache", "readonly")
			const count = await tx.objectStore("cache").count(`${this.name}/${id}`)

			db.close()

			return count > 0
		})
	}

	get(id: string): Bluebird<any> {
		if (this.isDisabled()) {
			return Bluebird.reject(new Error(`Cache is disabled ${this.name}`));
		}

		/*
		var cacheResult = this._db.cache.where("id").equals(this.name + "/" + id);

		this._db.cache.where("id").equals(this.name + "/" + id).modify({ used: new Date().getTime() });
		*/

		return Bluebird.try(async () => {
			const db = await openDatabase()
			const tx = db.transaction("cache", "readonly")
			const data = await tx.objectStore("cache").get(`${this.name}/${id}`)

			if (typeof data === "undefined") {
				throw new Error(`cache miss for ${this.getID(id)}`);
			}

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

			db.close()

			return data;
		})
	}

	/**
	 * get all cache entries as a dexie collection.<
	 * @return {Bluebird<any>} Promise containing all cache entries as a dexie collection.
	 */
	all(): Bluebird<any> {
		if (this.isDisabled()) {
			return Bluebird.resolve([]);
		}

		const entries = []

		return this.cursorEach((cursor) => entries.push(cursor.value), "readonly").then(() => entries)
	}

	getID(id) {
		return `${this.name}/${id}`
	}

	/**
	 * delete a certain cache entry.
	 * @param  {string}        id id of the entry
	 * @return {Bluebird<any>}    [description]
	 */
	delete(id: string): Bluebird<any> {
		if (this.isDisabled()) {
			return Bluebird.resolve();
		}

		return Bluebird.try(async () => {
			const db = await openDatabase()

			const tx = db.transaction("cache", "readwrite")

			await tx.objectStore("cache").delete(this.getID(id))
			db.close()
		})
	}

	deleteAll(): Bluebird<any> {
		if (this.isDisabled()) {
			return Bluebird.resolve();
		}

		const deleteRequests = []

		return this.cursorEach((cursor) => deleteRequests.push(cursor.delete()), "readwrite").then(() => Bluebird.all(deleteRequests))
	}

	private cursorEach(action, transactionType: "readonly" | "readwrite") {
		return Bluebird.try(async () => {
			const db = await openDatabase()

			const tx = db.transaction("cache", transactionType)
			const cursorPromise = tx.objectStore("cache").index("type").openCursor(this.name)

			await followCursorUntilDone(cursorPromise, action)
			db.close()
		})
	}

	private isDisabled() {
		return cachesDisabled || this.cacheDisabled
	}

	static disable() {
		cachesDisabled = true;
	}

	disable() {
		this.cacheDisabled = true;
	}
}
