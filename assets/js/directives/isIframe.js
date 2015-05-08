define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function mobileDirective() {
		return {
			scope:	false,
			restrict: "A",
			link: function (scope) {
				scope.isIframe = window.top !== window;
			}
		};
	}

	directivesModule.directive("mobile", [mobileDirective]);
});
