var screenSizeService = require("services/screenSize.service.ts").default;

"use strict";

const directivesModule = require("directives/directivesModule");

function mobileDirective() {
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

directivesModule.directive("mobile", [mobileDirective]);
