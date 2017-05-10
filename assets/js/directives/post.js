var templateUrl = require("../../views/directives/post.html");

define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function postDirective(localize) {
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

				scope.removePost = function () {
					if (confirm(localize.getLocalizedString("wall.confirmRemovePost"))) {
						scope.post.remove();
					}
				};
			}
		};
	}

	directivesModule.directive("post", ["localize", postDirective]);
});
