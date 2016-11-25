var templateUrl = require("../../views/directives/userimage.html");

define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function userimage() {
		return {
			transclude: false,
			scope:	{
				userData: 	"=user"
			},
			restrict: "E",
			templateUrl: templateUrl,
			replace: true
		};
	}

	directivesModule.directive("userimage", userimage);
});
