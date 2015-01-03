var db;

define(["step", "whispeerHelper", "asset/observer"], function (step, h, Observer) {
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
		var request;

		function Cache(name) {
			this._name = name;
		}

		Cache.prototype.allEntries = function () {
			var index = db.transaction("objects", "readwrite").objectStore("objects").index("type");
		};

		Cache.prototype.store = function (id, data) {
			var store = db.transaction("objects", "readwrite").objectStore("objects");
			store.add({
				data: data,
				created: new Date().getTime(),
				used: new Date().getTime(),
				id: this._name + "/" + id,
				type: this._name
			});
		};

		Cache.prototype.receive = function (id, cb) {
			step(function () {
				var request = db.transaction(this._name).objectStore(this._name).get(this._name + "/" + id);
				request.onerror = this;
				request.onsuccess = this.ne;
			}, h.sF(function (event) {
				this.ne(event.target.result);
			}), cb);
		};

		Cache.prototype.cleanUp = function () {

		};

		Observer.call(Cache);

		step(function () {
			if (!window.indexedDB.open) {
				return;
			}

			request = window.indexedDB.open("whispeer", 2);
			request.onerror = this;
			request.onsuccess = this.ne;
			request.onupgradeneeded = upgradeDatabase;
		}, h.sF(function () {
			db = request.result;
			Cache.notify("", "ready");

			db.onerror = errorService.criticalError;
		}), errorService.logError);

		return Cache;
	};

	service.$inject = ["ssn.errorService"];

	return service;
});