define(function () {
	"use strict";
	return function($timeout) {
		return {
			link: function(scope, elm, attrs) {
				elm.bind("focus", function() {
					$timeout(function() {
						scope.$eval(attrs.onfocus);
					});
				});
			}
		};
	};
});
