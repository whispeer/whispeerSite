define(function () {
	"use strict";
	function scrollTo($location, $anchorScroll) {
		return {
			restrict: "A",
			link: function(scope, iElement, iAttrs) {
				iElement.click(function () {
					$location.hash(iAttrs["scrolltoid"]);
					$anchorScroll();
				});
			}
		};
	}
	return scrollTo;
});
