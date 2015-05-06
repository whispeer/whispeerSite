define(["angular", "directives/directives"], function (angular) {
	"use strict";
	return angular.module("ssn.recovery", ["ssn.services", "ssn.directives", "ssn.models", "localization", "ngRoute"]);
});
