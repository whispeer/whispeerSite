var directivesModule = require("directives/directivesModule");
var templateUrl = require("../../views/directives/comment.html");

function commentDirective() {
	"use strict";

	return {
		transclude: true,
		scope:	{
			comment: "=comment"
		},
		restrict: "E",
		templateUrl: templateUrl,
		replace: true
	};			
}

directivesModule.directive("comment", commentDirective);
