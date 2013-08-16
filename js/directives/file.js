define([], function () {
	"use strict";

	return function () {
		return {
			link: function (scope, elm, attrs) {
				elm.bind("change", scope.$eval(attrs.file));
			}
		};
	};
});