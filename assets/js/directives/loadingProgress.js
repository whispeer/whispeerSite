"use strict";

const directivesModule = require("directives/directivesModule");

var templateUrl = require("../../views/directives/loadingProgress.html");

var loadingProgressDirective = function () {
	return {
		scope: {
			"getProgress": "=getProgress"
		},
		transclude: true,
		restrict: "E",
		templateUrl: templateUrl,
		link: function () {}
	};
};

directivesModule.directive("loadingProgress", loadingProgressDirective);
