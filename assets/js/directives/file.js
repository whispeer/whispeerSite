define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	var fileDirective = function () {
		return {
			link: function (scope, elm, attrs) {
				elm.bind("change", scope.$eval(attrs.file));
			}
		};
	};

	directivesModule.directive("file", fileDirective);
});
