define(["step", "whispeerHelper", "asset/observer", "bluebird"], function (Bluebird) {
	"use strict";
	var service = function () {
		var cacheService, socketService;
		var emit = Bluebird.promisify(socketService.emit.bind(socketService));

		function SyncedList(endPoint, cacheName, requestParams) {
			this._endPoint = endPoint;
			this._cacheName = cacheName;
			this._requestParams = requestParams;
		}

		SyncedList.prototype.load = function () {
			cacheService.get(JSON.stringify(this._requestParams)).bind(this).then(function (cacheResult) {
				if (cacheResult) {
					return cacheResult;
				} else {
					return emit(this._endPoint, this._requestParams);
				}
			});
		};

		SyncedList.prototype.loadMore = function () {};

		SyncedList.prototype.update = function () {};

		return SyncedList;
	};

	service.$inject = [];

	return service;
});