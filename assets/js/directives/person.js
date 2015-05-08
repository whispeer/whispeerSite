define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function personDirective() {
		return {
			transclude: true,
			scope:	{
				userData: "=user"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/person.html",
			replace: true
		};
	}

	directivesModule.directive("person", personDirective);
});
