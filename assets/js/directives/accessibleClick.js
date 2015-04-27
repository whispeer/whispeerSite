define(function () {
	"use strict";

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
						scope.$apply(function () {
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

	return accessibleClick;
});
