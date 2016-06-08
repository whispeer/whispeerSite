define(["services/serviceModule", "bluebird", "asset/observer", "debug"], function (serviceModule, Bluebird, Observer, debug) {
	"use strict";

	var debugName = "whispeer:initService";

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

	var service = function ($timeout, $rootScope, errorService, socketService, sessionService, migrationService, CacheService, keyStore) {
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
				return Promise.resolve(initResponse);
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
					return;
				}

				return request.options.cacheCallback(request.cache);
			});
		}		

		function runCallbacks(initResponses) {
			return Bluebird.all(initResponses).map(function (response) {
				var callback = response.callback;

				if (response.options.cache) {
					return callback(response.data.content).then(function (transformedData) {
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

		function loadData() {
			keyStore.security.blockPrivateActions();
			blockageToken = socketService.blockEmitWithToken();

			var runningInitCallbacks;
			return Bluebird.resolve().then(function () {

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
					initCacheCallbacks.map(runFunction),
					runCacheCallbacks(initRequests)
				]).then(function () {
					initService.notify("", "initCacheDone");
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
				return Bluebird.all(runningInitCallbacks);
			}).then(function () {
				timeEnd("init");
				keyStore.security.allowPrivateActions();
				socketService.allowEmit(blockageToken);

				migrationService();
				initService.notify("", "initDone");
			}).catch(errorService.criticalError);
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

	service.$inject = ["$timeout", "$rootScope", "ssn.errorService", "ssn.socketService", "ssn.sessionService", "ssn.migrationService", "ssn.cacheService", "ssn.keyStoreService"];

	serviceModule.factory("ssn.initService", service);
});
