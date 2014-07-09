define([], function () {
	"use strict";

	function focusMe($timeout) {
		return {
			scope: { trigger: "=focusMe" },
			link: function(scope, element) {
				scope.$watch("trigger", function(value) {
					if(value === true) { 
						$timeout(function() {
							element[0].focus(); 
						});
					}
				});
			}
		};
	}

	focusMe.$inject = ["$timeout"];

	return focusMe;
});