define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function commentDirective() {
		return {
			transclude: true,
			scope:	{
				comment: "=comment"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/comment.html",
			replace: true
		};			
	}

	directivesModule.directive("comment", commentDirective);;
});
