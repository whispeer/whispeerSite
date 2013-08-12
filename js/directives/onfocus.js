define(function () {
	"use strict";
	return function() {
		return {
			restrict: "A",
			link: function(scope, elm, attrs) {
				elm.bind("focus", function() {
					scope.$apply(function() {
						scope.$eval(attrs.focus);
					});
				});
			}
		};
	};
});
