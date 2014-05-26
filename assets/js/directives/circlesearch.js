define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function circleSearchDirective(userService, $timeout, circleService) {
		return {
			transclude: false,
			scope:	false,
			restrict: "E",
			templateUrl: "assets/views/directives/circleSearch.html",
			replace: true,
			link: function postLink(scope, element, attrs) {
				var user;
				scope.$on("createCircle", function (event, data) {
					if (user) {
						circleService.create(data, h.sF(function () {
							var circles = circleService.inWhichCircles(user);
							scope.$broadcast("resetSearch");
							scope.$broadcast("initialSelection", circles.map(function (e) {
								return e.data;
							}));
						}), [user])
					}
				});

				function submitResults(results) {
					scope.$broadcast("queryResults", results);
				}

				if (attrs["user"]) {
					user = h.parseDecimal(scope.$parent.$eval(attrs["user"]));
					step(function () {
						circleService.loadAll(this);
					}, h.sF(function () {
						$timeout(this);
					}), h.sF(function () {
						var circles = circleService.inWhichCircles(user);
						scope.$broadcast("initialSelection", circles.map(function (e) {
							return e.data;
						}));
					}));
				}

				scope.$on("elementSelected", function (e) {
					e.stopPropagation();
				});

				scope.$on("queryChange", function (event, query) {
					event.stopPropagation();
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