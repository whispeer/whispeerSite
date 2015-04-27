define([], function () {
	"use strict";

	return function ($injector, scope) {
		scope.selectResult = function(result) {
			scope.hide();

			scope.callback({ selected: result });
		};
	};
});
