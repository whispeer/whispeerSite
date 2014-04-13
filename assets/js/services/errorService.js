define([], function () {
	"use strict";

	var service = function () {
		var api = {
			criticalError: function (e) {
				if (e) {
					console.error(e);
				}
			}
		};

		return api;
	};

	service.$inject = [];

	return service;
});