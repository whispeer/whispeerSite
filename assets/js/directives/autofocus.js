define(["directives/directivesModule"], function (directivesModule) {
	"use strict";
	var autofocusDirective = function() {
		return {
			link: function(scope, elm, attr) {
				if (!attr.autofocus || attr.autofocus === "true") {
					elm.focus();
				}
			}
		};
	};

	directivesModule.directive("autofocus", autofocusDirective);
});
