define(["whispeerHelper", "dexie", "bluebird", "services/serviceModule", "services/errorService"], function (h, Dexie, Promise, serviceModule) {
	"use strict";

	var db, errorService, cacheDisabled = false;

	function Cache(name, options) {
		this._name = name;
		this._options = options || {};
		this._options.maxEntries = this._options.maxEntries || 100;
		this._options.maxBlobSize = this._options.maxBlobSize || 1*1024*1024;
	}

	Cache.prototype.entries = function () {
		if (cacheDisabled) {
			return Promise.resolve();
		}

		return db.cache.where("type").equals(this._name);
	};

	Cache.prototype.entryCount = function () {
		if (cacheDisabled) {
			return Promise.reject();
		}

		return Promise.resolve(db.cache.where("type").equals(this._name).count());
	};

	Cache.prototype._fixBlobStorage = function (cacheEntry) {
		var blobToDataURI = Promise.promisify(h.blobToDataURI.bind(h));

		return Promise.resolve(cacheEntry.blobs).map(blobToDataURI).then(function (blobsAsUri) {
			cacheEntry.blobs = blobsAsUri;
			return db.cache.add(cacheEntry);
		});
	};

	Cache.sumSize = function (arr) {
		return arr.reduce(function (prev, cur) {
			return prev + cur.size;
		}, 0);
	};

	Cache.prototype.store = function (id, data, blobs) {
		if (cacheDisabled) {
			return Promise.resolve();
		}

		if (blobs && !h.array.isArray(blobs)) {
			blobs = [blobs];
		}

		if (blobs && this._options.maxBlobSize !== -1 && Cache.sumSize(blobs) > this._options.maxBlobSize) {
			return Promise.resolve();
		}

		Promise.delay().bind(this).then(function () {
			return this.cleanUp();
		}).catch(errorService.criticalError);

		var cacheEntry = {
			data: JSON.stringify(data),
			created: new Date().getTime(),
			used: new Date().getTime(),
			id: this._name + "/" + id,
			type: this._name,
			size: 0
		}, that = this;

		if (blobs) {
			cacheEntry.blobs = blobs;
			cacheEntry.size = Cache.sumSize(blobs);
		}

		return Promise.resolve(db.cache.put(cacheEntry).catch(function (e) {
			console.warn(e);
			if (e.code && e.code === e.DATA_CLONE_ERR) {
				return that._fixBlobStorage(cacheEntry);
			} else {
				return Promise.reject(e);
			}
		}));
	};

	Cache.prototype.get = function (id) {
		if (cacheDisabled) {
			return Promise.reject(new Error("Cache is disabled"));
		}

		var theCache = this;
		var cacheResult = db.cache.where("id").equals(this._name + "/" + id);

		db.cache.where("id").equals(this._name + "/" + id).modify({ used: new Date().getTime() });

		return Promise.resolve(cacheResult.first().then(function (data) {
			if (typeof data !== "undefined") {
				data.data = JSON.parse(data.data);

				data.blobs = data.blobs.map(function (blob) {
					if (typeof blob === "string") {
						return h.dataURItoBlob(blob);
					}

					return blob;
				});

				if (data.blobs && data.blobs.length === 1) {
					data.blob = data.blobs[0];
				}

				return data;
			}

			throw new Error("cache miss for " + theCache._name + "/" + id);
		}));
	};

	/** get all cache entries as a dexie collection. */
	Cache.prototype.all = function () {
		if (cacheDisabled) {
			return Promise.resolve([]);
		}

		return db.cache.where("id").startsWith(this._name + "/");
	};

	/** delete a certain cache entry
	* id: id of the entry
	*/
	Cache.prototype.delete = function (id) {
		if (cacheDisabled) {
			return Promise.resolve();
		}

		return db.cache.where("id").equals(this._name + "/" + id).delete();
	};

	Cache.prototype.cleanUp = function () {
		if (cacheDisabled) {
			return Promise.resolve();
		}

		if (this._options.maxEntries === -1) {
			return;
		}

		//remove data which hasn't been used in a long time
		return Promise.resolve(this.entryCount().bind(this).then(function (count) {
			console.log("Contains: " + count + " Entries (" + this._name + ")");
			if (count > this._options.maxEntries) {
				console.warn("cleaning up cache " + this._name);
				db.cache.orderBy("used").limit(count - this._options.maxEntries).delete();
			}
		}));
	};

	Cache.disable = function () {
		cacheDisabled = true;
	};

	Cache.enable = function () {
		cacheDisabled = false;
	};

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

	function service (_errorService) {
		errorService = _errorService;

		if (db) {
			db.on("blocked", errorService.logError);
		} else {
			Cache.disable();
		}

		return Cache;
	}

	service.$inject = ["ssn.errorService"];

	serviceModule.factory("ssn.cacheService", service);
});
