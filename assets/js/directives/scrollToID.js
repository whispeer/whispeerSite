define(function () {
	"use strict";
	function scrollTo() {
		return {
			restrict: "A",
			require: "$scope, $location, $anchorScroll",
			link: function(hash) {
				debugger;
				$location.hash(hash);
				$anchorScroll();
			}
		};
	}
	return scrollTo;
});
