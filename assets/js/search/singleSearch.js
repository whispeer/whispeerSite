define([], function () {
	"use strict";

	return function ($injector, scope) {
		scope.selectResult = function(index) {
			var result = scope.results[index];

			scope.click(false);
			scope.focus(false);

			scope.callback(result);
		};
	};
});
