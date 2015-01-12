define(["step", "whispeerHelper", "asset/observer"], function () {
	"use strict";
	var service = function () {
		function syncedObject(endPoint, cacheName, id, immutable) {
			
		}

		syncedObject.prototype.load = function () {};
		syncedObject.prototype.update = function () {
			if (immutable) {
				return;
			}
		};
	};

	service.$inject = [];

	return service;
});