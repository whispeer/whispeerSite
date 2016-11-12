var templateUrl = require("../../views/directives/loadingindicator.html");
var directivesModule = require("directives/directivesModule");

function loadingindicatorDirective() {
	"use strict";

	return {
		transclude: true,
		scope:	{},
		restrict: "E",
		templateUrl: templateUrl,
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
