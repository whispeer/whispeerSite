define(["angular", "config/localizationConfig", "runners/promiseRunner"], function (angular) {
	"use strict";
	return angular.module("ssn.recovery", [
		"ssn.services",
		"ssn.user",
		"ssn.directives",
		"ssn.models",
		"ssn.interceptors.config",
		"ssn.locale.config",
		"localization",
		"ssn.runners",
	]).config(["ssn.sessionServiceProvider", function (sessionServiceProvider) {
		sessionServiceProvider.noRedirect();
	}]);
});
