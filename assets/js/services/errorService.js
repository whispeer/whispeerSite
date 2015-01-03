define([], function () {
	"use strict";

	function logError(e) {
		if (e) {
			console.error(e);
			errors.push({
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

	return service;
});