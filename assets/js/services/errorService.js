define(["services/serviceModule", "config"], function (serviceModule, config) {
	"use strict";

	var service = function ($http) {
		var api = {
			criticalError: function (e) {
				api.logError(e);
			},
			logError: function logError(e) {
				if (e) {
					console.error(e);
					$http.post(
						(config.https ? "https://" : "http://") +
						config.ws +
						":" + config.wsPort +
						"/reportError",
					JSON.stringify({ error: e.toString() }));

					globalErrors.push({
						e: e,
						str: e.toString(),
						stack: e.stack
					});
				}
			},
			failOnErrorPromise: function (state, promise) {
				return promise.then(function () {
					state.success();
				}).catch(function (e) {
					state.failed();
					api.criticalError(e);
				});
			},
			failOnError: function (state) {
				return function (e) {
					if (e) {
						state.failed();
						api.criticalError(e);
					} else {
						state.success();
					}
				};
			}
		};

		return api;
	};

	service.$inject = ["$http"];

	serviceModule.factory("ssn.errorService", service);
});
