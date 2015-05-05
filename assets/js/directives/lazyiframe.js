define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function lazyiframeDirective() {
		return {
			restrict: "E",
			template: "",
			link: function (scope, iElement, iAttrs) {
				window.setTimeout(function () {
					var attributes = {
						src: iAttrs.src,
						id: iAttrs.id,
						class: iAttrs.class
					};

					iElement.append(
						jQuery("<iframe>").attr(attributes)
					);
				}, 5);
			}
		};
	}

	directivesModule.directive("lazyiframe", lazyiframeDirective);
});
