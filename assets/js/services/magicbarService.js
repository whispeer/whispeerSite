define([], function() {
	"use strict";
	var service = function() {
		var magic = {
			"template":	"messages",
			"showDefault":	true,
			"ready": false
		};
		return magic;
	};
	service.$inject = [];

	return service;
});