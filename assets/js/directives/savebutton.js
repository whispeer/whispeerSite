define(function () {
	"use strict";

	function savebuttonDirective() {
		return {
			transclude: true,
			scope:	{
				state:		"=state",
				translation:"@translation"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/saveButton.html",
			replace: true,
			link: function (scope, iElement, iAttrs) {
				scope.successIcon = "icon-ok-circle";
				scope.initIcon = "icon-ok-circle";
				scope.failureIcon = "icon-cancel-circle";

				if (iAttrs.initicon) {
					scope.initIcon = iAttrs.initicon;
				}

				if (iAttrs.successicon) {
					scope.successIcon = iAttrs.successicon;
				}

				if (iAttrs.failureicon) {
					scope.failureIcon = iAttrs.failureicon;
				}

				if (typeof iAttrs.noiniticon !== "undefined") {
					delete scope.initIcon;
				}
			}
		};
	}

	return savebuttonDirective;
});