define(["directives/directivesModule"], function (directivesModule) {
	"use strict";
	var stopEventDirective = function () {
		return {
			restrict: "A",
			link: function (scope, element, attr) {
				element.bind(attr.stopEvent, function (e) {
					e.stopPropagation();
				});
			}
		};
	};

	directivesModule.directive("stopEvent", stopEventDirective);
});
