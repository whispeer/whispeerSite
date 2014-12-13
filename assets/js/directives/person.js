define(function () {
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

	return personDirective;
});