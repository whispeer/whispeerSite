define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	var UPDATEINTERVAL = 1 * 1000;
	var appCache = window.applicationCache;

	function handleCacheEvent (e) {
		console.log("cache event");
		console.log(e);
	}

	function handleCacheError (e) {
		console.log("Error: Cache failed to update!");
		console.log(e);
	}

	function handleCacheUpdating (e) {
		console.log("Updating whispeer!");
	}

	function handleCacheProgress (e) {
		console.log("Progress: " + (e.loaded/e.total*100) + "%");
	}

	function checkForUpdate () {
		appCache.update();
	}

	if (appCache) {

		console.log("Appcache enabled!");
		console.log(appCache.status);

		// Fired after the first cache of the manifest.
		appCache.addEventListener("cached", handleCacheEvent, false);

		// An update was found. The browser is fetching resources.
		appCache.addEventListener("downloading", handleCacheUpdating, false);

		// The manifest returns 404 or 410, the download failed,
		// or the manifest changed while the download was in progress.
		appCache.addEventListener("error", handleCacheError, false);

		// Fired for each resource listed in the manifest as it is being fetched.
		appCache.addEventListener("progress", handleCacheProgress, false);

		// Fired when the manifest resources have been newly redownloaded.
		appCache.addEventListener("updateready", handleCacheEvent, false);

		window.setInterval(checkForUpdate, UPDATEINTERVAL);

	}

	var service = function () {
		return {
			checkForUpdate: function () {

			},
			getStatus: function () {

			},
			isUpdateReady: function () {

			}
		};
	};

	service.$inject = [];

	return service;

});
