define([
	"angular",
	"angularRoute",
	"controllers/controllers",
	"services/services",
	"filter/filter",
	"directives/directives",
	"search/loader",
	"models/models",
	"localizationModule",
	"emptyInclude"
], function (angular) {
	"use strict";

	return angular.module("ssn", ["ssn.controllers", "ssn.models", "ssn.services", "ssn.directives", "ssn.filter", "ssn.search", "localization", "ngRoute", "ngTouch"], function ($compileProvider) {
		$compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob|app):|data:image\//);
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|app):/);
	});
});
