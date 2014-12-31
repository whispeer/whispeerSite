define(["config"], function (config) {
	"use strict";

	var UPDATEINTERVAL = config.production ? 5 * 60 * 1000 : 1 * 1000;
	var appCache = window.applicationCache;

	function handleCacheUpdateReady () {
		console.log("cache update ready");
		if (!config.production) {
			window.location.reload();
		}
	}

	function handleCacheError (e) {
		console.log("Error: Cache failed to update!");
		console.log(e);
	}

	function handleCacheUpdating () {
		console.log("Updating whispeer to a new version!");
	}

	function handleCacheProgress (e) {
		console.log("Progress: " + (e.loaded/e.total*100) + "%");
	}

	function checkForUpdate () {
		appCache.update();
	}

	if (appCache) {

		// An update was found. The browser is fetching resources.
		appCache.addEventListener("downloading", handleCacheUpdating, false);

		// The manifest returns 404 or 410, the download failed,
		// or the manifest changed while the download was in progress.
		appCache.addEventListener("error", handleCacheError, false);

		// Fired for each resource listed in the manifest as it is being fetched.
		appCache.addEventListener("progress", handleCacheProgress, false);

		// Fired when the manifest resources have been newly redownloaded.
		appCache.addEventListener("updateready", handleCacheUpdateReady, false);

		window.setInterval(checkForUpdate, UPDATEINTERVAL);

	}

	var service = function () {
		return {
			checkForUpdate: checkForUpdate,
			isUpdateReady: function () {
				return appCache.status === appCache.UPDATEREADY;
			}
		};
	};

	service.$inject = [];

	return service;

});
