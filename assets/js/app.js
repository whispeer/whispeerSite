/*
	Console-polyfill. MIT license.
	https://github.com/paulmillr/console-polyfill
	Make it safe to do console.log() always.
*/
(function(con) {
	"use strict";
	var dummy = function() {};

	var methods =
		["assert","clear","count","debug","dir","dirxml","error","exception","group","groupCollapsed",
		"groupEnd","info","log","markTimeline","profile","profileEnd","table","time","timeEnd",
		"timeStamp","trace","warn"];

	con.memory = {};

	var i;
	for (i = 0; i < methods.length; i += 1) {
		con[methods[i]] = con[methods[i]] || dummy;
	}
})(this.console = this.console || {}); // Using `this` for web workers.

define([
	"angular",
	"angularRoute",
	"controllers/controllers",
	"controllers/magicbarControllers",
	"services/services",
	"filter/filter",
	"directives/directives",
	"models/models",
	"i18n/localizationModule",
	"emptyInclude"
], function (angular) {
	"use strict";

	return angular.module("ssn", ["ssn.controllers", "ssn.models", "ssn.magicbar.controllers", "ssn.services", "ssn.directives", "ssn.filter", "localization", "ngRoute"], function ($compileProvider) {
		$compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob|app):|data:image\//);
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|app):/);
	});
});