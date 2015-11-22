/**
* StorageService
**/
define(["services/serviceModule", "bluebird", "services/cacheService"], function (serviceModule, Bluebird) {
	"use strict";

	var service = function ($rootScope, Cache) {
		var Storage;

		function hasLocalStorage() {
			try {
				localStorage.setItem("localStorageTest", "localStorageTest");
				localStorage.removeItem("localStorageTest");
				return true;
			} catch (e) {
				return false;
			}
		}

		var theCache = new Cache("localStorage");

		if (hasLocalStorage()) {
			Storage = function (prefix) {
				this._prefix = prefix;
				this._loadingPromise = Bluebird.resolve();
			};

			Storage.prototype.get = function getF(key) {
				return localStorage.getItem(this._calculateKey(key));
			};

			Storage.prototype.set = function setF(key, data) {
				localStorage.setItem(this._calculateKey(key), data);
			};

			Storage.prototype.remove = function removeF(key) {
				localStorage.removeItem(this._calculateKey(key));
			};

			Storage.prototype.clear = function clearF() {
				var usedKeys = Object.keys(localStorage);
				usedKeys.filter(function (key) {
					return key.indexOf(this._prefix) === 0;
				}, this).forEach(function (key) {
					localStorage.removeItem(key);
				});

				return this.save();
			};

			Storage.prototype.save = function () {
				return Bluebird.resolve();
			};

		} else {
			Storage = function (prefix) {
				var that = this;

				this._prefix = prefix;

				this._localStorageData = {};
				this._loadingPromise = theCache.get(this._prefix).then(function (_localStorageData) {
					if (_localStorageData) {
						that._localStorageData = _localStorageData.data;
					}
				}).catch(function (e) {
					console.warn(e);
				});

			};

			Storage.prototype.get = function (key) {
				return this._localStorageData[this._calculateKey(key)];
			};

			Storage.prototype.set = function (key, data) {
				this._localStorageData[this._calculateKey(key)] = "" + data;
			};

			Storage.prototype.remove = function (key) {
				delete this._localStorageData[this._calculateKey(key)];
			};

			Storage.prototype.clear = function () {
				var usedKeys = Object.keys(this._localStorageData);
				usedKeys.filter(function (key) {
					return key.indexOf(this._prefix) === 0;
				}, this).forEach(function (key) {
					delete this._localStorageData[key];
				}, this);

				return this.save();
			};

			Storage.prototype.save = function () {
				return theCache.store(this._prefix, this._localStorageData);
			};

		}

		Storage.prototype._calculateKey = function (key) {
			return this._prefix + "." + key;
		};

		Storage.prototype.awaitLoading = function () {
			return this._loadingPromise;
		};

		$rootScope.$on("ssn.reset", function () {
			var sessionStorage = new Storage("whispeer.session");
			sessionStorage.awaitLoading().then(function () {
				sessionStorage.clear();
			});
		});

		return Storage;
	};

	service.$inject = ["$rootScope", "ssn.cacheService"];

	serviceModule.factory("ssn.storageService", service);
});
