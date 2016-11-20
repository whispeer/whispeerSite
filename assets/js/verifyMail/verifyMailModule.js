define(["angular", "directives/savebutton", "directives/mobile", "directives/isIframe", "runners/promiseRunner"], function (angular) {
	"use strict";
	return angular.module("ssn.verifyMail", ["ssn.services", "ssn.directives", "ssn.runners"]);
});
