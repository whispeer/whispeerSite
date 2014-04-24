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
		$compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);
	});
});