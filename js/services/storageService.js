/* jshint undef: true, unused: true */
/* global localStorage */


/**
* StorageService
**/
define([], function () {
	"use strict";

	var available = true, polyfill = {};

	var service = function () {
		this.get = function getF(key) {
			if (available) {
				return localStorage.getItem(key);
			} else {
				return polyfill[key];
			}
		};

		this.set = function setF(key, data) {
			if (available) {
				localStorage.setItem(key, data);
			} else {
				polyfill[key] = data;
			}
		};

		this.remove = function removeF(key) {
			if (available) {
				localStorage.removeItem(key);
			} else {
				delete polyfill[key];
			}
		};

		this.clear = function clearF() {
			polyfill = {};
			localStorage.clear();
		};
	};

	service.$inject = [];

	return service;
});