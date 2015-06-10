define(["directives/directivesModule", "whispeerHelper"], function (directivesModule, h) {
	"use strict";

	function growDirective($timeout) {
		return {
			restrict: "A",
			link: function (scope, element, attributes) {
				var initialHeight = element.innerHeight;

				function ensureSafeCSS() {
					element.css({
						overflow: "hidden",
						resize: "none",
						transition: "none"
					});
				}

				var resetCSS = h.debounce(function () {
					element.css({
						overflow: "",
						resize: "",
						transition: ""
					});
				}, 50);

				/* this does not work with transitions */
				function updateHeight() {
					ensureSafeCSS();

					element.height(0);
					var newHeight = element[0].scrollHeight;

					var height = newHeight + 20;
					height = Math.max(newHeight, initialHeight);
					height = Math.min(parseInt(attributes.maximumHeight, 10), height);
					element.innerHeight(height);

					resetCSS();
				}

				element.on("keydown keyup paste", updateHeight);

				scope.$watch(function () {
					return scope[attributes.grow];
				}, function (isActive) {
					if (isActive) {
						$timeout(function () {
							initialHeight = element.innerHeight();
							updateHeight();
						});
					} else if (isActive === false) {
						element.innerHeight("");
					}
				});
			}
		};
	}

	directivesModule.directive("grow", ["$timeout", growDirective]);
});
