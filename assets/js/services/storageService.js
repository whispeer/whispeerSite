/**
* StorageService
**/
define(["services/serviceModule"], function (serviceModule) {
	"use strict";

	var service = function ($rootScope) {
		var Storage = function (prefix) {
			this._prefix = prefix;
		};

		Storage.prototype.get = function getF(key) {
			var finalKey = this._prefix + "." + key;
			return localStorage.getItem(finalKey);
		};

		Storage.prototype.set = function setF(key, data) {
			var finalKey = this._prefix + "." + key;
			localStorage.setItem(finalKey, data);
		};

		Storage.prototype.remove = function removeF(key) {
			var finalKey = this._prefix + "." + key;
			localStorage.removeItem(finalKey);
		};

		Storage.prototype.clear = function clearF() {
			var usedKeys = Object.keys(localStorage);
			usedKeys.filter(function (key) {
				return key.indexOf(this._prefix) === 0;
			}, this).forEach(function (key) {
				console.log("removing key: " + key);
				localStorage.removeItem(key);
			});
		};

		$rootScope.$on("ssn.reset", function () {
			new Storage("whispeer.session").clear();
		});

		return Storage;
	};

	service.$inject = ["$rootScope"];

	serviceModule.factory("ssn.storageService", service);
});
