define(function () {
	"use strict";

	function userimage() {
		return {
			transclude: false,
			scope:	{
				userData: 	"=user",
				trustlevel:	"=trustlevel"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/userimage.html",
			replace: true
		};
	}

	return userimage;
});