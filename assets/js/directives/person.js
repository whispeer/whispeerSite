var templateUrl = require("../../views/directives/person.html");

define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function personDirective() {
		return {
			transclude: true,
			scope:	{
				userData: "=user"
			},
			restrict: "E",
			templateUrl: templateUrl,
			replace: true
		};
	}

	directivesModule.directive("person", personDirective);
});
