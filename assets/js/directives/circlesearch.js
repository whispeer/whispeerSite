define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function circleSearchDirective(userService, $location, circleService) {
		return {
			transclude: false,
			scope:	{},
			restrict: "E",
			templateUrl: "/assets/views/directives/circleSearch.html",
			replace: true,
			link: function postLink(scope) {
				function submitResults(results) {
					scope.$broadcast("queryResults", results);
				}

				scope.resultTemplate = "/assets/views/directives/circleSearchResults.html";

				scope.$on("queryChange", function (event, query) {
					step(function () {
						circleService.loadAll(this);
					}, h.sF(function () {
						var circles = circleService.data.circles;

						if (query === "") {
							submitResults(circles);
							return;
						}

						var i, result = [];
						for (i = 0; i < circles.length; i += 1) {
							if (circles[i].name.toLowerCase().indexOf(query.toLowerCase()) > -1) {
								result.push(circles[i]);
							}
						}

						submitResults(result);
					}));
				});
			}
		};
	}

	return circleSearchDirective;
});