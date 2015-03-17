define([], function () {
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
			templateUrl: "assets/views/directives/search.html",
			replace: false,
			transclude: false,
			link: function (scope, iElement, iAttrs) {
				var searchSupplier = $injector(iAttrs.supplier);

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
					scope.hide();
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
								scope.searching = false;
								scope.results = results;
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

				/** suchergebnisse auswählen und hinzufügen */

				function selectionUpdated(selection) {
					if (selection) {
						scope.callback(selection);
					}
				}

				scope.selectResult = function(index) {
					var result = scope.results[index];

					scope.click(false);
					scope.focus(false);

					selectionUpdated(result);
				};

				/** key stuff */

				var UP = [38, 33];
				var DOWN = [40, 34];

				scope.keydown = function (e) {
					if (UP.indexOf(e.keyCode) > -1) {
						addCurrent(-1);
						e.preventDefault();
					}

					if (DOWN.indexOf(e.keyCode) > -1) {
						addCurrent(1);
						e.preventDefault();
					}
				};
			}
		};
	}

	searchDirective.$inject = ["$injector"];

	return searchDirective;
});