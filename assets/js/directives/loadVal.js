define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function loadVal($parse) {
		return {
			restrict: "A",
			link: function ($scope, $element, $attrs) {
				var getter, setter, val, elementValue;

				if ($element.attr("type") === "checkbox") {
					elementValue = $element.is(":checked");
				} else {
					elementValue = $element.val();
				}

				val = $attrs.loadVal || elementValue;
				getter = $parse($attrs.ngModel);
				setter = getter.assign;
				setter($scope, val);
			}
		};
	}

	loadVal.$inject = ["$parse"];

	directivesModule.directive("loadVal", loadVal);
});
