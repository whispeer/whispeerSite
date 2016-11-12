var multipleTemplateUrl = require("../../views/directives/searchMultiple.html");
var singleTemplateUrl = require("../../views/directives/search.html");

define(["whispeerHelper", "search/singleSearch", "search/multiSearch", "directives/directivesModule"], function (h, singleSearch, multiSearch, directivesModule) {
	"use strict";

	var lastSearchOpened = 0;

	function searchDirective($injector) {
		return {
			scope: {
				"callback": "&",
				"inputI18nAttr": "@",
				"searchTemplate": "@",
				"addClasses": "@",
				//multi-search
				"selectDropTemplate": "@",
				"base": "@",
				"initialValues": "&"
			},
			/* this is an element */
			restrict: "E",
			templateUrl: function (iElement, iAttrs) {
				if (typeof iAttrs.multiple !== "undefined") {
					return multipleTemplateUrl;
				}

				return singleTemplateUrl;
			},
			replace: false,
			transclude: false,
			link: function (scope, iElement, iAttrs) {
				var thisSearchOpened = 0;
				var SearchSupplierClass = $injector.get(iAttrs.supplier);
				var searchSupplier = new SearchSupplierClass();
				scope.selectDropTemplate = scope.selectDropTemplate || "default";

				scope.filter = [];
				scope.filter.push(function (results) {
					if (!iAttrs.filter) {
						return results;
					}

					var filter = scope.$parent.$eval(iAttrs.filter);

					return results.filter(function (result) {
						return filter.indexOf(result.id) === -1;
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
				scope.unFilteredResults = [];

				/** open search element or not **/
				var isVisible = false, initialized = false;

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

				var noAutoClose = typeof iAttrs.noAutoClose !== "undefined";

				scope.isVisible = function () {
					return isVisible && (noAutoClose || lastSearchOpened === thisSearchOpened);
				};

				scope.hide = function () {
					isVisible = false;

					initialize();
				};

				scope.show = function ($event) {
					if ($event) {
						$event.stopPropagation();
					}

					if (!noAutoClose) {
						lastSearchOpened = thisSearchOpened = new Date().getTime();
					}
					isVisible = true;
					initialize();
				};

				/** suchergebnisse laden */
				scope.searching = false;

				scope.queryChange = function (noDiffNecessary) {
					var currentQuery = scope.query;

					if (oldQuery !== currentQuery) {
						scope.show();
					}

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
						}).catch(function (error) {
							if (currentQuery === scope.query) {
								scope.$applyAsync(function () {
									console.error(error);
									scope.searching = false;

									scope.unFilteredResults = [];
									scope.results = [];
								});
							}
						});
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

					scope.current = Math.min(scope.current, scope.results.length - 1);
					scope.current = Math.max(0, scope.current);
				};

				/** key stuff */

				var UP = [38, 33];
				var DOWN = [40, 34];
				var SELECT = [13];
				var CLOSE = [27];

				scope.keydown = function (e) {
					if (CLOSE.indexOf(e.keyCode) > -1) {
						scope.hide();
					}

					if (UP.indexOf(e.keyCode) > -1) {
						addCurrent(-1);
						e.preventDefault();
					}

					if (DOWN.indexOf(e.keyCode) > -1) {
						addCurrent(1);
						e.preventDefault();
					}

					if (SELECT.indexOf(e.keyCode) > -1) {
						scope.selectResult(scope.results[scope.current]);
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

	directivesModule.directive("search", searchDirective);
});
