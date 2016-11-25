define(["services/serviceModule", "bluebird", "asset/observer", "debug", "whispeerHelper"], function (serviceModule, Bluebird, Observer, debug, h) {
	"use strict";

	var debugName = "whispeer:initService";
	var initServiceDebug = debug(debugName);

	function time(name) {
		if (debug.enabled(debugName)) {
			console.time(name);
		}
	}

	function timeEnd(name) {
		if (debug.enabled(debugName)) {
			console.timeEnd(name);
		}
	}

	var service = function ($timeout, $rootScope, errorService, socketService, sessionService, migrationService, CacheService, keyStore, requestKeyService) {
		var initRequestsList = [], initCallbacks = [], initCacheCallbacks = [], initService, blockageToken;

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

				requestObject.blockageToken = blockageToken;

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
					return callback(response.data.content, blockageToken).then(function (transformedData) {
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
			return func(blockageToken);
		}

		function runInitCacheCallbacks() {
			return Bluebird.all(initCacheCallbacks.map(runFunction));
		}

		function loadData() {
			keyStore.security.blockPrivateActions();
			blockageToken = socketService.blockEmitWithToken();

			requestKeyService.setBlockageToken(blockageToken);

			var runningInitCallbacks;
			var promise = Bluebird.resolve().then(function () {

				time("cacheInitGet");
				return initRequestsList;
			}).map(function (initRequest) {
				if (initRequest.options.cache) {
					return getCache(initRequest);
				} else {
					return initRequest;
				}
			}).then(function (initRequests) {
				timeEnd("cacheInitGet");
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
				runningInitCallbacks = initCallbacks.map(runFunction);

				time("serverInitGet");
				return getServerData(initRequests);
			}).then(function (initResponses) {
				timeEnd("serverInitGet");
				time("init");
				return runCallbacks(initResponses);
			}).then(function () {
				initServiceDebug("Callbacks done!");
				return Bluebird.all(runningInitCallbacks);
			}).then(function () {
				timeEnd("init");
				keyStore.security.allowPrivateActions();
				socketService.allowEmit(blockageToken);

				migrationService();
				initService.notify("", "initDone");
				return null;
			});

			promise.catch(errorService.criticalError);

			return promise;
		}

		var loadingPromise = sessionService.listenPromise("ssn.login").then(function () {
			return loadData();
		});

		initService = {
			/** get via api, also check cache in before!
			* @param domain: domain to get from
			*/
			awaitLoading: function (cb) {
				return loadingPromise.nodeify(cb);
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

		Observer.call(initService);

		return initService;
	};

	service.$inject = ["$timeout", "$rootScope", "ssn.errorService", "ssn.socketService", "ssn.sessionService", "ssn.migrationService", "ssn.cacheService", "ssn.keyStoreService", "ssn.requestKeyService"];

	serviceModule.factory("ssn.initService", service);
});
