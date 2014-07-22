define([], function () {
	"use strict";

	var service = function () {
		var api = {
			criticalError: function (e) {
				if (e) {
					console.error(e);
				}
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

	return service;
});