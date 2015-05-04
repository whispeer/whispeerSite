define([
		"angular",
		"directives/savebutton",
		"directives/passwordinput",
		"directives/validatedForm"
	], function (angular) {
	"use strict";
	return angular.module("ssn.register", ["ssn.services", "ssn.directives", "localization"]);
});
