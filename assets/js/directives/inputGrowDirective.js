define(["directives/directivesModule", "whispeerHelper"], function (directivesModule, h) {
	"use strict";

	var BOTTOM_PADDING = 10;

	function growDirective($timeout) {
		return {
			restrict: "A",
			link: function (scope, element, attributes) {
				var parent = element.parent();
				var initialHeight = parent.innerHeight;

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

					parent.height(0);
					var height = element[0].scrollHeight;

					if (height >= initialHeight) {
						height = height + BOTTOM_PADDING;
					}

					height = Math.max(height, initialHeight);
					height = Math.min(parseInt(attributes.maximumHeight, 10), height);
					parent.innerHeight(height);

					resetCSS();
				}

				element.on("keydown keyup paste", updateHeight);

				scope.$watch(function () {
					return scope[attributes.grow];
				}, function (isActive) {
					if (isActive) {
						$timeout(function () {
							initialHeight = parent.innerHeight();
							updateHeight();
						});
					} else if (isActive === false) {
						parent.innerHeight("");
					}
				});
			}
		};
	}

	directivesModule.directive("grow", ["$timeout", growDirective]);
});
