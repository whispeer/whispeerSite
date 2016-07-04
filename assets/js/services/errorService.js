define(["services/serviceModule"], function (serviceModule) {
	"use strict";

	function logError(e) {
		if (e) {
			console.error(e);
			globalErrors.push({
				e: e,
				str: e.toString(),
				stack: e.stack
			});
		}
	}

	var service = function () {
		var api = {
			criticalError: function (e) {
				logError(e);
			},
			logError: logError,
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

	service.$inject = [];

	serviceModule.factory("ssn.errorService", service);
});
