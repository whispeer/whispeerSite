console.warn(`Whispeer startup at ${Date.now()}`)
console.time("Spinner on Home")

var errorService = require("./error.service").errorServiceInstance;
var keyStore = require("crypto/keyStore");
var socketService = require("services/socket.service").default;
var CacheService = require("./Cache").default;

var h = require("../helper/helper").default;
var debug = require("debug");
var Observer = require("asset/observer");
var Bluebird = require("bluebird");

var sessionService = require("services/session.service").default;

var debugName = "whispeer:initService";
var initServiceDebug = debug(debugName);

function time(name) {
	if (debug.enabled(debugName)) {
		console.time("init: " + name);
	}
}

function timeEnd(name) {
	if (debug.enabled(debugName)) {
		console.timeEnd("init: " + name);
	}
}

var initRequestsList = [], initCallbacks = [], initCacheCallbacks = [], initService;

function getCache(initRequest) {
	return new CacheService(initRequest.domain).get(initRequest.id || sessionService.getUserID()).then(function (cache) {
		initRequest.cache = cache;

		return initRequest;
	}).catch(function () {
		return initRequest;
	});
}

function setCache(initResponse, transformedData) {
	if (!transformedData) {
		return Bluebird.resolve(initResponse);
	}


	return new CacheService(initResponse.domain)
	.store(initResponse.id || sessionService.getUserID(), transformedData)
	.then(function () {
		return initResponse;
	})
	.catch(function () {
		return initResponse;
	});
}

function getServerData(initRequests) {
	return Bluebird.resolve(initRequests).map(function (request) {
		var requestObject = {
			responseKey: "content"
		};

		var id = request.id;

		if (typeof id === "function") {
			id = id();
		}

		if (typeof id !== "undefined") {
			requestObject.id = id;
		}

		if (request.cache && request.cache.data) {
			if (request.cache.data._signature) {
				requestObject.cacheSignature = request.cache.data._signature;
			} else if (request.cache.data.meta && request.cache.data.meta._signature) {
				requestObject.cacheSignature = request.cache.data.meta._signature;
			}
		}

		return socketService.definitlyEmit(request.domain, requestObject).then(function (response) {
			request.data = response;

			return request;
		});
	});
}

function runCacheCallbacks(initRequests) {
	return Bluebird.all(initRequests).map(function (request) {
		if (!request.cache || !request.options.cacheCallback) {
			return !request.options.cache;
		}

		return request.options.cacheCallback(request.cache).thenReturn(true);
	});
}

function runCallbacks(initResponses) {
	return Bluebird.all(initResponses).map(function (response) {
		var callback = response.callback;

		if (response.options.cache) {
			return callback(response.data.content).then(function (transformedData) {
				initServiceDebug("Callback done:" + response.domain);
				if (!transformedData) {
					return;
				}

				return setCache(response, transformedData);
			});
		}

		return callback(response.data.content);
	});
}

function runFunction(func) {
	return func();
}

function runInitCacheCallbacks() {
	return Bluebird.all(initCacheCallbacks.map(runFunction));
}

function loadData() {
	keyStore.security.blockPrivateActions();

	var runningInitCallbacks;
	var promise = Bluebird.resolve().then(function () {

		time("getCache");
		return initRequestsList;
	}).map(function (initRequest) {
		if (initRequest.options.cache) {
			return getCache(initRequest);
		} else {
			return initRequest;
		}
	}).then(function (initRequests) {
		timeEnd("getCache");
		time("runCacheCallbacks")

		return Bluebird.all([
			runInitCacheCallbacks(),
			runCacheCallbacks(initRequests)
		]).spread(function (customCacheResults, simpleCacheResults) {
			if (simpleCacheResults.reduce(h.and, true)) {
				initService.notify("", "initCacheDone");
			} else {
				initServiceDebug("Could not load cache!");
			}

			return null;
		}).catch(errorService.criticalError).thenReturn(initRequests);
	}).then(function (initRequests) {
		timeEnd("runCacheCallbacks")
		runningInitCallbacks = initCallbacks.map(runFunction);

		time("getServer");
		return getServerData(initRequests);
	}).then(function (initResponses) {
		timeEnd("getServer");
		time("runMainCallbacks");
		return runCallbacks(initResponses);
	}).then(function () {
		initServiceDebug("Callbacks done!");
		return Bluebird.all(runningInitCallbacks);
	}).then(function () {
		timeEnd("runMainCallbacks");
		keyStore.security.allowPrivateActions();

		var migrationService = require("services/migrationService");
		migrationService();
		initService.notify("", "initDone");
		return null;
	});

	promise.catch(errorService.criticalError);

	return promise;
}

var loadingPromise = sessionService.awaitLogin().then(function () {
	return loadData();
});

initService = {
	/** get via api, also check cache in before!
	* @param domain: domain to get from
	*/
	awaitLoading: function () {
		return loadingPromise
	},
	get: function (domain, cb, options) {
		initRequestsList.push({
			domain: domain,
			callback: cb,
			options: options || {}
		});
	},
	registerCacheCallback: function (cb) {
		initCacheCallbacks.push(cb);
	},
	registerCallback: function (cb) {
		initCallbacks.push(cb);
	}
};

Observer.extend(initService);

module.exports = initService;
