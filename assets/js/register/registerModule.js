define([
		"angular",

		"config/localizationConfig",
		"localizationModule"
	], function (angular) {
	"use strict";
	return angular.module("ssn.register", ["ssn.services", "ssn.directives", "ssn.locale.config", "localization"]);
});
