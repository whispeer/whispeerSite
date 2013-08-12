define(function () {
	"use strict";
	return function() {
		return {
			link: function(scope, elm, attrs) {
				elm.bind("focus", function() {
					scope.$apply(function() {
						scope.$eval(attrs.onfocus);
					});
				});
			}
		};
	};
});
