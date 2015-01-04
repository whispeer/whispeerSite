define(function () {
	"use strict";

	function accessibleClick($compile) {
		return {
			restrict: "A",
			replace: false,
			terminal: true,
			priority: 1001,
			link: function link(scope,element, attrs) {
				element.attr("data-ng-click", attrs.accessibleClick);
				element.attr("data-ng-keypress", attrs.accessibleClick);
				element.attr("tabIndex", "0");
				element.attr("role", "button");

				element.removeAttr("data-accessible-click"); //remove the attribute to avoid indefinite loop
				element.removeAttr("accessible-click"); //also remove the same attribute with data- prefix in case users specify data-common-things in the html

				$compile(element)(scope);
			}
		};
	}

	accessibleClick.$inject = ["$compile"];

	return accessibleClick;
});