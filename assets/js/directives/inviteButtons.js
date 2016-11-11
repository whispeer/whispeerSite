var templateUrl = require("../../views/directives/inviteButtons.html");

define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function newPostDirective() {
		return {
			scope: {},
			restrict: "E",
			templateUrl: templateUrl,
			replace: false,
			transclude: false,
			controller: "ssn.inviteController"
		};
	}

	newPostDirective.$inject = [];

	directivesModule.directive("invitebuttons", newPostDirective);
});
