define(["step", "whispeerHelper"], function (step, h) {
	"use strict";

	function filterSearchDirective(keyStore, userService, $timeout, circleService, localize) {
		return {
			transclude: false,
			scope:	false,
			restrict: "E",
			templateUrl: "assets/views/directives/filterSearch.html",
			replace: true,
			link: function postLink(scope, iElement, iAttrs) {
				//how do we sort stuff?
				//first: alwaysAvailableFilter
				//second: circles
				//third: specific user

				function submitResults(results) {
					scope.$broadcast("queryResults", results);
				}

				var alwaysAvailableFilter = ["allfriends"];

				function loadInitialSelection(attribute) {
					var selected = scope.$parent.$eval(attribute);
					step(function () {
						$timeout(this);
					}, h.sF(function () {
						var i;
						for (i = 0; i < selected.length; i += 1) {
							getElementById(selected[i], this.parallel());
						}

						this.parallel()();
					}), h.sF(function (result) {
						scope.$broadcast("initialSelection", result || []);
					}));
				}

				if (iAttrs.selected) {
					scope.$on("reloadInitialSelection", function () {
						loadInitialSelection(iAttrs.selected);
					});

					loadInitialSelection(iAttrs.selected);
				}

				function getCircle(id, cb) {
					step(function () {
						circleService.loadAll(this);
					}, h.sF(function () {
						var circle = circleService.get(id).data;
						this.ne({
							name: circle.name,
							id: "circle:" + circle.id,
							count: circle.userids.length
						});
					}), cb);
				}

				function getAlwaysCount(id) {
					var key, me = userService.getown();

					switch(id) {
						case "allfriends":
							key = me.getFriendsKey();
							break;
						default:
							return 0;
					}

					return keyStore.upload.getKeyAccessCount(key) - 1;
				}

				function getAlways(id, cb) {
					step(function () {
						this.ne({
							name: localize.getLocalizedString("directives." + id),
							id: "always:" + id,
							count: getAlwaysCount(id)
						});
					}, cb);
				}

				function getElementById(id, cb) {
					var part1 = id.substr(0, 7);
					var part2 = id.substr(7);
					if (part1 === "always:") {
						getAlways(part2, cb);
					} else if (part1 === "circle:") {
						getCircle(part2, cb);
					}
				}

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
							count: getAlwaysCount(e)
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