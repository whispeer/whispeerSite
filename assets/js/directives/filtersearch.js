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

				/*step(function () {
					circleService.loadAll(this);
				}, h.sF(function () {
					$timeout(this);
				}), h.sF(function () {
					scope.$broadcast("initialSelection", []);
				}));*/

				function matchesQuery(query, val) {
					if (query === "") {
						return true;
					}

					if (val.toLowerCase().indexOf(query) > -1) {
						return true;
					}

					return false;
				}

				function matchEach(vals, query, attr, cb) {
					var i, cur, result = [];

					for (i = 0; i < vals.length; i += 1) {
						cur = vals[i];
						if (typeof attr === "function") {
							if (matchesQuery(query, attr(cur))) {
								result.push(cb(cur));
							}
						} else if (matchesQuery(query, cur[attr])) {
							result.push(cb(cur));
						}
					}

					return result;
				}

				scope.$on("queryChange", function (event, query) {
					query = query.toLowerCase();

					var alwaysAvailable = matchEach(alwaysAvailableFilter, query, function (e) {
						return localize.getLocalizedString("directives." + e);
					}, function (e) {
						return {
							name: localize.getLocalizedString("directives." + e),
							id: "always:" + e,
							count: 0
						};
					});

					submitResults(alwaysAvailable);

					step(function () {
						circleService.loadAll(this);
					}, h.sF(function () {
						var circles = circleService.data.circles;

						var circle = matchEach(circles, query, "name", function (e) {
							return {
								name: e.name,
								id: "circle:" + e.id,
								count: e.userids.length
							};
						});

						submitResults(alwaysAvailable.concat(circle));
					}));
				});
			}
		};
	}

	return filterSearchDirective;
});