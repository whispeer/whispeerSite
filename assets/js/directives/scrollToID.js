define(["directives/directivesModule"], function (directivesModule) {
	"use strict";
	function scrollToIDDirective() {
		return {
			restrict: "A",
			link: function(scope, iElement, iAttrs) {
				iElement.click(function () {
					var elm, hash = iAttrs.scrolltoid;

					if ((elm = document.getElementById(hash))) {
						elm.scrollIntoView();
					}
				});
			}
		};
	}
	scrollToIDDirective.$inject = ["$location", "$anchorScroll"];
	scrollToIDDirective.$name = "scrolltoid";

	directivesModule.directive("scrolltoid", scrollToIDDirective);
});
