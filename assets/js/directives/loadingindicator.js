define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function loadingindicatorDirective() {
		return {
			transclude: true,
			scope:	{},
			restrict: "E",
			templateUrl: "assets/views/directives/loadingindicator.html",
			replace: true,
			link: function (scope, iElement, iAttrs) {
				if (iAttrs.color) {
					scope.color = iAttrs.color;
				} else {
					scope.color = "black";
				}
			}
		};
	}

	directivesModule.directive("loadingindicator", loadingindicatorDirective);
});
