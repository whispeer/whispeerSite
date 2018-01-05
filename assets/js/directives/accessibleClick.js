"use strict";

const directivesModule = require("directives/directivesModule");

function accessibleClick() {
	return {
		restrict: "A",
		replace: false,
		scope: {
			accessibleClick: "&"
		},
		link: function link(scope,element) {
			var SELECT = [13];
			element.on("click", function () {
				scope.accessibleClick();
			});

			element.on("keypress", function (e) {
				if (SELECT.indexOf(e.keyCode) > -1) {
					scope.$applyAsync(function () {
						scope.accessibleClick();
					});
				}
			});

			element.attr("tabIndex", "0");
			element.attr("role", "button");
		}
	};
}

accessibleClick.$inject = [];

directivesModule.directive("accessibleClick", accessibleClick);
