define(["angular", "directives/savebutton", "directives/mobile", "runners/promiseRunner"], function (angular) {
	"use strict";
	return angular.module("ssn.verifyMail", ["ssn.directives", "ssn.runners"]);
});
