define([], function () {
	"use strict";

	return function ($injector, scope) {
		scope.selectResult = function(result) {
			scope.click(false);
			scope.focus(false);

			scope.callback()(result);
		};
	};
});
