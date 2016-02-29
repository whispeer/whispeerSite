/* global caches, fetch, self, Response */

"use strict";

/*
	install: load current commit hash and files config -> add to db
	fetch:
		- maybe update if not updated or old
		- 
		- get files list from cache
	store meta data in cache
*/

self.importScripts("/assets/js/bower/bluebird/js/browser/bluebird.js");

var CACHEPREFIX = "whispeer-";
var FILESCONFIGURL = "/assets/files.json";
var COMMITHASHURL = "/assets/commit.sha";

var CACHEFILENAME = "cacheMetaData.json";

var currentCacheName;
var currentFilesConfig;

function hashToCacheName(hash) {
	return CACHEPREFIX + hash;
}

function getAndCache(cache, url) {
	return cache.match(url).then(function (response) {
		if (!response) {
			return fetch(url);
		}

		return response;
	}).then(function (response) {
		if (!response.ok) {
			throw new Error("Could not get file list");
		}

		cache.put(url, response.clone());

		return response;
	});
}

function timestamp() {
	return new Date().getTime();
}

function storeMetaData(cache, metaData) {
	return cache.put(CACHEFILENAME, new Response(JSON.stringify(metaData)));
}

function isOurCacheName(name) {
	return name.indexOf(CACHEPREFIX) === 0;
}

function getMetaData(cache) {
	return cache.match(new self.Request(CACHEFILENAME)).then(function (response) {
		return response.json();
	}).then(function (json) {
		return json;
	});
}

function getLatestCache() {
	caches.keys().then(function (keys) {
		keys.filter(function (key) {
			return isOurCacheName(key);
		});

		if (keys.length === 1) {
			return caches.open(keys[0]);
		}

		throw new Error("no cache found :(");
	});
}

function deleteOldCaches() {
	return Promise.resolve(caches.keys()).then(function (keys) {
		return keys;
	}).filter(function (key) {
		return isOurCacheName(key);
	}).map(function (key) {
		return caches.open(key).then(function (cache) {
			return getMetaData(cache);
		}).then(function (meta) {
			meta.key = key;

			return meta;
		});
	}).then(function(metaData) {
		var notLoaded = metaData.filter(function (meta) {
			return !meta.loaded;
		});

		var loaded = metaData.filter(function (meta) {
			return meta.loaded;
		});

		loaded.sort(function (a, b) {
			return b.loaded - a.loaded;
		});

		loaded.shift();

		var remove = notLoaded.concat(loaded);

		console.log("Removing outdated caches (" + remove.length + ")", JSON.stringify(remove));

		return remove;
	}).map(function (toDelete) {
		console.log("Removing cache: " + toDelete.key);
		return caches.delete(toDelete.key);
	});
}

function fillCache(cache) {
	var opened = timestamp();
	return storeMetaData(cache, { opened: opened, loaded: 0 }).then(function () {
		return getAndCache(cache, FILESCONFIGURL);
	}).then(function (response) {
		return response.json();
	}).then(function (filesConfig) {
		console.log(filesConfig);
		cache.addAll(filesConfig.preload);
	}).then(function () {
		storeMetaData(cache, { opened: opened, loaded: timestamp() });
	});
}

function loadIfNewer(hashCacheName) {
	return caches.keys().then(function(keyList) {
		if (keyList.indexOf(hashCacheName) === -1) {
			console.log("Got a different commit hash - updating (" + hashCacheName + ")");

			return caches.open(hashCacheName).then(function (cache) {
				return fillCache(cache);
			}).then(function () {
				return keyList;
			});
		}

		console.log("Cache already loaded: (" + hashCacheName + ")");

		return keyList;
	}).then(function (keyList) {
		keyList.filter(function (cacheName) {
			return isOurCacheName(cacheName) &&  cacheName !== hashCacheName;
		}).map(function () {
			return caches.delete(cacheName);
		});
	}).then(function () {
		return caches.open(hashCacheName);
	}).catch(function () {
		//update failed delete the new cache!
		return caches.delete(hashCacheName).then(function () {
			return getLatestCache();
		});
	});

}

function checkForUpdate() {
	return deleteOldCaches().then(function () {
		return fetch(COMMITHASHURL);
	}).then(function (response) {
		if (response.ok) {
			return response.text();
		} else {
			return getLatestCache();
		}
	}).then(function (hash) {
		return loadIfNewer(hashToCacheName(hash));
	});
}

self.addEventListener("fetchDisabled", function(event) {
  event.respondWith(
    cache.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request);
      }
    )
  );
});

self.addEventListener("activate", function(event) {
	console.log("activate" + timestamp());
	event.waitUntil(deleteOldCaches());
});

self.addEventListener("install", function(event) {
	console.log("install" + timestamp());
	event.waitUntil(checkForUpdate());
});
