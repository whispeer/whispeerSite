define(["whispeerHelper", "search/singleSearch", "search/multiSearch"], function (h, singleSearch, multiSearch) {
	"use strict";

	function searchDirective($injector) {
		return {
			scope: {
				"callback": "=",
				"inputI18nAttr": "@",
				"searchTemplate": "@"
			},
			/* this is an element */
			restrict: "E",
			templateUrl: function (iElement, iAttrs) {
				if (typeof iAttrs.multiple !== "undefined") {
					return "assets/views/directives/searchMultiple.html";
				}

				return "assets/views/directives/search.html";
			},
			replace: false,
			transclude: false,
			link: function (scope, iElement, iAttrs) {
				var SearchSupplierClass = $injector.get(iAttrs.supplier);
				var searchSupplier = new SearchSupplierClass();

				scope.filter = [];
				scope.filter.push(function (results) {
					if (!iAttrs.filter) {
						return results;
					}

					var filter = scope.$eval(iAttrs.filter);

					return results.filter(function (result) {
						return filter.indexOf(h.parseDecimal(result.id)) === -1;
					});
				});

				scope.applyFilterToResults = function (results) {
					scope.filter.forEach(function (filter) {
						results = filter(results);
					});

					return results;
				};

				var oldQuery = "";
				/* attribute to define if we want multiple results or one */
				scope.query = "";
				scope.results = [];

				/** open search element or not **/
				var focused = false, clicked = false, initialized = false;

				function initialize() {
					if (!initialized) {
						initialized = true;
						scope.queryChange(true);
					}
				}

				/* close on body click */
				jQuery(document.body).click(function () {
					scope.$apply(function () {
						scope.hide();
					});
				});

				scope.show = function () {
					return (focused || clicked);
				};

				scope.hide = function () {
					scope.focus(false);
					scope.click(false);
				};

				scope.click = function (bool, $event) {
					if ($event) {
						$event.stopPropagation();
						$event.preventDefault();
					}

					clicked = bool;
					initialize();
				};

				scope.focus = function (bool) {
					focused = bool;
					initialize();
				};

				/** suchergebnisse laden */
				scope.searching = false;

				scope.queryChange = function (noDiffNecessary) {
					var currentQuery = scope.query;
					if (noDiffNecessary || oldQuery !== currentQuery) {
						oldQuery = scope.query;
						scope.searching = true;

						searchSupplier.search(scope.query).then(function (results) {
							if (currentQuery === scope.query) {
								scope.$apply(function () {
									scope.searching = false;

									scope.unFilteredResults = results;
									scope.results = scope.applyFilterToResults(scope.unFilteredResults);
								});
							}
						});
					}

					if (oldQuery !== scope.query) {
						scope.click(true);
					}
				};

				scope.$on("hide", function () {
					scope.hide();
				});

				scope.$on("resetSearch", function () {
					scope.query = "";
					scope.queryChange(true);
				});

				/** suchergebnisse markieren */
				scope.current = 0;

				function addCurrent(val) {
					scope.setCurrent(scope.current + val);
				}

				scope.setCurrent = function (val) {
					scope.current = val;

					scope.current = Math.max(0, scope.current);
					scope.current = Math.min(scope.current, scope.results.length - 1);
				};

				/** key stuff */

				var UP = [38, 33];
				var DOWN = [40, 34];
				var ENTER = [13];

				scope.keydown = function (e) {
					if (UP.indexOf(e.keyCode) > -1) {
						addCurrent(-1);
						e.preventDefault();
					}

					if (DOWN.indexOf(e.keyCode) > -1) {
						addCurrent(1);
						e.preventDefault();
					}

					if (ENTER.indexOf(e.keyCode) > -1) {
						scope.selectResult(scope.current);
						e.preventDefault();
					}
				};

				if (typeof iAttrs.multiple !== "undefined") {
					multiSearch($injector, scope, iElement, iAttrs);
				} else {
					singleSearch($injector, scope, iElement, iAttrs);
				}
			}
		};
	}

	searchDirective.$inject = ["$injector"];

	return searchDirective;
});
