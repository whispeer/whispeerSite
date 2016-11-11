define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function newPostDirective() {
		return {
			restrict: "A",
			replace: false,
			transclude: false,
			link: function ($scope, element) {
				element.on("click", "a,button", function () {
					$scope.closeSidebar();
					$scope.$applyAsync();
				});
			}
		};
	}

	directivesModule.directive("closeSidebar", newPostDirective);
});
