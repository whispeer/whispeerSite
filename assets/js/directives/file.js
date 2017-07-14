"use strict";

const directivesModule = require("directives/directivesModule");

var fileDirective = function () {
	return {
		link: function (scope, elm, attrs) {
			elm.bind("change", scope.$eval(attrs.file));
		}
	};
};

directivesModule.directive("file", fileDirective);
