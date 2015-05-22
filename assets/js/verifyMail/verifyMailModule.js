define(["angular", "directives/savebutton", "directives/mobile", "directives/isIframe"], function (angular) {
	"use strict";
	return angular.module("ssn.verifyMail", ["ssn.services", "ssn.directives"]);
});
