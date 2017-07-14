"use strict";
const directivesModule = require("directives/directivesModule");
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
