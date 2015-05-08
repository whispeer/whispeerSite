define(["directives/directivesModule"], function (directivesModule) {
	"use strict";
	var directive =  function($timeout) {
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

	directive.$inject = ["$timeout"];

	directivesModule.directive("onfocus", directive);
});
