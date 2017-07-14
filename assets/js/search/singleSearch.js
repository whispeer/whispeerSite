"use strict";

module.exports = function ($injector, scope) {
	scope.selectResult = function(result) {
		scope.hide();

		scope.callback({ selected: result });
	};
};
