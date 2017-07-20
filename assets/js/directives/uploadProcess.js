"use strict";

const directivesModule = require("directives/directivesModule");

var templateUrl = require("../../views/directives/uploadProcess.html");

var uploadProcessDirective = function () {
	return {
		scope: {
			"upload": "=upload"
		},
		transclude: true,
		restrict: "E",
		templateUrl: templateUrl,
		link: function (scope, elm, attrs) {}
	};
};

directivesModule.directive("uploadProcess", uploadProcessDirective);
