define(function () {
	"use strict";
	return function() {
		return {
			link: function(scope, elm, attr) {
				if (!attr.autofocus || attr.autofocus === "true") {
					elm.focus();
				}
			}
		};
	};
});
