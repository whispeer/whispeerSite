define([], function() {
	"use strict";
	var service = function() {
		var magic = {
			"template":	"messages",
			"showDefault":	true
		};
		return magic;
	};
	service.$inject = [];

	return service;
});