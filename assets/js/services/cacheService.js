define(["dexie", "bluebird"], function (Dexie, Promise) {
	"use strict";

	var db = new Dexie("whispeer");

	db.version(2).stores({
		cache: "id,created,used,type,size"
	});

	db.version(1).stores({
		blobs: "id"
	});

    db.open();

	var service = function (errorService) {
		db.on("error", errorService.criticalError);
		db.on("blocked", errorService.logError);

		function Cache(name, options) {
			this._name = name;
			this._options = options || {};
		}

		Cache.prototype.entryCount = function () {
			return Promise.resolve(db.cache.where("type").equals(this._name).count());
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
			};

			if (blob) {
				cacheEntry.blob = blob;
				cacheEntry.size = blob.size;
			}

			return Promise.resolve(db.cache.add(cacheEntry));
		};

		Cache.prototype.get = function (id) {
			var cacheResult = db.cache.where(":id").equals(this._name + "/" + id);

			cacheResult.modify({ used: new Date().getTime() });
			return Promise.resolve(cacheResult.first().then(function (data) {
				if (typeof data !== "undefined") {
					data.data = JSON.parse(data.data);

					return data;
				}

				throw new Error("cache miss");
			}));
		};

		Cache.prototype.cleanUp = function () {
			//remove data which hasn't been used in a long time or is very big
			return Promise.resolve(this.entryCount().then(function (count) {
				if (count > 100) {
					db.orderBy("used").limit(count - 100).delete();
				}
			}));
		};

		return Cache;
	};

	service.$inject = ["ssn.errorService"];

	return service;
});
