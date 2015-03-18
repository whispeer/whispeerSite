define(["jquery"], function (jQuery) {
	"use strict";
	return function () {
		return {
			scope: {
				visible: "=show",
				loading: "=loading"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/modal.html",
			replace: true,
			transclude: true,
			link: function (scope, iElement, attrs) {
				var ESC = 27;
				var CLOSEKEYS = [ESC];

				scope.hide = function () {
					scope.visible = false;
				};

				scope.show = function () {
					scope.visible = true;
				};

				scope.toggle = function () {
					scope.visible = !scope.visible;
				};

				jQuery(document).keyup(function (e) {
					if (scope.visible && CLOSEKEYS.indexOf(e.keyCode) > -1) {
						scope.visible = false;
						scope.$apply();
					}
				});
			}
		};
	};
});
