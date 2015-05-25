define(["angular", "config/localizationConfig"], function (angular) {
	"use strict";
	return angular.module("ssn.recovery", [
		"ssn.services",
		"ssn.directives",
		"ssn.models",
		"ssn.interceptors.config",
		"ssn.locale.config",
		"localization"
	]).config(["ssn.sessionServiceProvider", function (sessionServiceProvider) {
		sessionServiceProvider.noRedirect();
	}]);
});
