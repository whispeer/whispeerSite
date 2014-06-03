/**
* StorageService
**/
define([], function () {
	"use strict";

	var available = !!window.localStorage, polyfill = {};

	var service = function ($rootScope) {
		var storage = {
			get: function getF(key) {
				if (available) {
					return localStorage.getItem(key);
				} else {
					return polyfill[key];
				}
			},

			set: function setF(key, data) {
				if (available) {
					localStorage.setItem(key, data);
				} else {
					polyfill[key] = data;
				}
			},

			remove: function removeF(key) {
				if (available) {
					localStorage.removeItem(key);
				} else {
					delete polyfill[key];
				}
			},

			clear: function clearF() {
				polyfill = {};
				if (available) {
					localStorage.clear();
				}
			}
		};

		$rootScope.$on("ssn.reset", function () {
			storage.clear();
		});

		return storage;
	};

	service.$inject = ["$rootScope"];

	return service;
});