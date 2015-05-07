define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function lazyiframeDirective() {
		return {
			restrict: "E",
			template: "",
			link: function (scope, iElement, iAttrs) {
				var attributes = {}, attributesEmpty = [];

				Object.keys(iAttrs.$attr).filter(function (attr) {
					return attr.indexOf("ng") !== 0;
				}).map(function (attr) {
					return {
						key: attr,
						val: iAttrs.$attr[attr]
					};
				}).forEach(function (attr) {
					attributes[attr.val] = iAttrs[attr.key];
					attributesEmpty.push(attr.val);
				});

				function append() {
					iElement.append(
						jQuery("<iframe>").attr(attributes)
					);

					attributesEmpty.forEach(function (attr) {
						iElement.removeAttr(attr);
					});
				}

				if (iAttrs.delay) {
					window.setTimeout(append, parseInt(iAttrs.delay, 10));
				} else {
					append();
				}
			}
		};
	}

	directivesModule.directive("lazyiframe", lazyiframeDirective);
});
