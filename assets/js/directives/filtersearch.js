define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function filterSearchDirective(userService, $timeout, circleService, localize) {
		return {
			transclude: false,
			scope:	{},
			restrict: "E",
			templateUrl: "/assets/views/directives/filterSearch.html",
			replace: true,
			link: function postLink(scope) {

				//how do we sort stuff?
				//first: alwaysAvailableFilter
				//second: circles
				//third: specific user

				function submitResults(results) {
					scope.$broadcast("queryResults", results);
				}

				var alwaysAvailableFilter = ["allfriends", "friendsofriends"];

				scope.resultTemplate = "/assets/views/directives/filterSearchResults.html";

				step(function () {
					circleService.loadAll(this);
				}, h.sF(function () {
					$timeout(this);
				}), h.sF(function () {
					scope.$broadcast("initialSelection", []);
				}));

				scope.$on("queryChange", function (event, query) {
					var result = [];
					step(function () {
						circleService.loadAll(this);
					}, h.sF(function () {
						var circles = circleService.data.circles;

						var i;
						for (i = 0; i < alwaysAvailableFilter.length; i += 1) {
							var localized = localize.getLocalizedString("directives." + alwaysAvailableFilter[i]);
							if (localized.indexOf(query) !== -1) {
								result.push({
									name: localized,
									id: "always:" + alwaysAvailableFilter[i],
									count: 0
								});
							}
						}

						if (query === "") {
							submitResults(result);
							return;
						}

						for (i = 0; i < circles.length; i += 1) {
							if (circles[i].name.toLowerCase().indexOf(query.toLowerCase()) > -1) {
								result.push({
									name: circles[i].name,
									id: "circle:" + circles[i].id,
									count: circles[i].userids.length
								});
							}
						}

						submitResults(result);
					}));
				});
			}
		};
	}

	return filterSearchDirective;
});