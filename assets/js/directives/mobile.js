define(["directives/directivesModule", "services/screenSizeService"], function (directivesModule) {
	"use strict";

	function mobileDirective(screenSizeService) {
		return {
			scope:	false,
			restrict: "A",
			link: function (scope) {
				scope.mobile = screenSizeService.mobile;
				screenSizeService.listen(function (mobile) {
					scope.mobile = mobile;
				});
			}
		};
	}

	directivesModule.directive("mobile", ["ssn.screenSizeService", mobileDirective]);
});
