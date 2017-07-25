"use strict";

const directivesModule = require("directives/directivesModule");

var templateUrl = require("../../views/directives/displayFile.html");

var displayFileDirective = function () {
	return {
		scope: {
			"file": "=file"
		},
		transclude: true,
		restrict: "E",
		templateUrl: templateUrl,
		link: function (scope, elm, attrs) {}
	};
};

directivesModule.directive("displayFile", displayFileDirective);
