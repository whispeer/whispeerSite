var templateUrl = require("../../views/directives/post.html");

define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function postDirective() {
		return {
			transclude: true,
			scope:	{
				post: "=post"
			},
			restrict: "E",
			templateUrl: templateUrl,
			replace: true,
			link: function (scope) {
				scope.showComments = false;
				scope.toggleShowComments = function () {
					scope.showComments = !scope.showComments;
					scope.post.loadComments();
				};
			}
		};			
	}

	directivesModule.directive("post", postDirective);
});
