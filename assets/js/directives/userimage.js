define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function userimage() {
		return {
			transclude: false,
			scope:	{
				userData: 	"=user"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/userimage.html",
			replace: true
		};
	}

	directivesModule.directive("userimage", userimage);
});
