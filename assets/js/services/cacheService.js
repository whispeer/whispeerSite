define(["whispeerHelper", "dexie", "bluebird", "services/serviceModule"], function (h, Dexie, Promise, serviceModule) {
	"use strict";

	var db, errorService;

	function Cache(name, options) {
		this._name = name;
		this._options = options || {};
	}

	Cache.prototype.entryCount = function () {
		return Promise.resolve(db.cache.where("type").equals(this._name).count());
	};

	Cache.prototype._fixBlobStorage = function (cacheEntry) {
		var blobToDataURI = Promise.promisify(h.blobToDataURI, h);

		return blobToDataURI(cacheEntry.blob).then(function (blobAsUri) {
			cacheEntry.blob = blobAsUri;
			return db.cache.add(cacheEntry);
		});
	};

	Cache.prototype.store = function (id, data, blob) {
		if (blob && blob.size > 1*1024*1024) {
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

		if (blob) {
			cacheEntry.blob = blob;
			cacheEntry.size = blob.size;
		}

		return Promise.resolve(db.cache.put(cacheEntry).catch(function (e) {
			if (e.code && e.code === e.DATA_CLONE_ERR) {
				return that._fixBlobStorage(cacheEntry);
			} else {
				return Promise.reject(e);
			}
		}));
	};

	Cache.prototype.get = function (id) {
		var cacheResult = db.cache.where(":id").equals(this._name + "/" + id);

		cacheResult.modify({ used: new Date().getTime() });
		return Promise.resolve(cacheResult.first().then(function (data) {
			if (typeof data !== "undefined") {
				data.data = JSON.parse(data.data);

				if (typeof data.blob === "string") {
					data.blob = h.dataURItoBlob(data.blob);
				}

				return data;
			}

			throw new Error("cache miss");
		}));
	};

	Cache.prototype.cleanUp = function () {
		//remove data which hasn't been used in a long time or is very big
		return Promise.resolve(this.entryCount().then(function (count) {
			if (count > 100) {
				db.cache.orderBy("used").limit(count - 100).delete();
			}
		}));
	};

	function NoCache() {}

	NoCache.prototype.entryCount = function () {
		return Promise.reject();
	};

	NoCache.prototype.store = function () {
		return Promise.resolve();
	};

	NoCache.prototype.get = function () {
		return Promise.reject();
	};

	NoCache.prototype.cleanUp = function () {
		return Promise.resolve();
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

		if (!db) {
			return NoCache;
		}

		db.on("blocked", errorService.logError);

		return Cache;
	}

	service.$inject = ["ssn.errorService"];

	serviceModule.factory("ssn.cacheService", service);
});
