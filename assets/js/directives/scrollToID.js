define(function () {
	"use strict";
	function scrollTo() {
		return {
			restrict: "A",
			link: function(scope, iElement, iAttrs) {
				iElement.click(function () {
					var elm, hash = iAttrs["scrolltoid"];

					if ((elm = document.getElementById(hash))) {
						elm.scrollIntoView();
					}
				});
			}
		};
	}
	return scrollTo;
});
