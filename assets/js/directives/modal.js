define(function () {
	"use strict";
	return function () {
		return {
			scope: {
				visible: "=show"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/modal.html",
			replace: true,
			transclude: true,
			link: function (scope, element, attrs) {
				scope.hide = function () {
					scope.visible = false;
				};

				scope.show = function () {
					scope.visible = true;
				};

				scope.toggle = function () {
					scope.visible = !scope.visible;
				};
			}
		};
	};
});