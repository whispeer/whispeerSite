define(["angular", "i18n/localizationConfig", "runners/promiseRunner"], function (angular) {
	"use strict";
	return angular.module("ssn.recovery", [
		"ssn.services",
		"ssn.user",
		"ssn.directives",
		"ssn.models",
		"localization",
		"ssn.runners",
	]);
});
