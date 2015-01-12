var db;

define(["step", "whispeerHelper", "asset/observer", "bluebird"], function (step, h, Observer, Promise) {
	"use strict";

	var upgrades = {
		version1: function (db) {
			db.createObjectStore("blobs");
		},
		version2: function (db) {
			db.deleteObjectStore("blobs");

			var objectStore = db.createObjectStore("objects", { keyPath: "id" });
			objectStore.createIndex("created", "created", { unique: false });
			objectStore.createIndex("used", "used", { unique: false });
			objectStore.createIndex("type", "type", { unique: false });
		}
	};

	function upgradeDatabase(event) {
		var i;
		for (i = event.oldVersion+1; i <= event.newVersion; i += 1) {
			upgrades["version" + i](event.target.result);
		}
	}

	var service = function (errorService) {
		var databasePromise;

		function promisify(request) {
			return new Promise(function (resolve, reject) {
				request.onerror = reject;
				request.onsuccess = resolve;
			}).then(function (event) {
				return event.target.result;
			});
		}

		function Cache(name) {
			this._name = name;
		}

		Cache.prototype.entryCount = function () {
			return databasePromise.then(function (db) {
				return promisify(db.transaction("objects").objectStore("objects").index("type").count(this._name));
			});
		};

		Cache.prototype.store = function (id, data) {
			return databasePromise.then(function (db) {
				var store = db.transaction("objects", "readwrite").objectStore("objects");
				return promisify(store.add({
					data: data,
					created: new Date().getTime(),
					used: new Date().getTime(),
					id: this._name + "/" + id,
					type: this._name
				}));
			});
		};

		Cache.prototype.get = function (id) {
			return databasePromise.then(function (db) {
				return promisify(db.transaction("objects").objectStore("objects").get(this._name + "/" + id));
			}).then(function (result) {
				result.used = new Date().getTime();
				db.transaction("objects", "readwrite").objectStore("objects").update(this._name + "/" + id, result);

				return result.data;
			});
		};

		Cache.prototype.cleanUp = function () {
			//remove data which hasn't been used in a long time or is very big
		};

		Observer.call(Cache);

		if (!window.indexedDB || !window.indexedDB.open) {
			return;
		}

		var request = window.indexedDB.open("whispeer", 2);
		request.onupgradeneeded = upgradeDatabase;

		databasePromise = promisify(request).then(function (db) {
			Cache.notify("", "ready");
			db.onerror = errorService.criticalError;

			return db;
		});

		return Cache;
	};

	service.$inject = ["ssn.errorService"];

	return service;
});