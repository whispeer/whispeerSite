define(["step", "whispeerHelper"], function () {
	"use strict";

	function searchDirective($timeout, $compile) {
		return {
			transclude: false,
			scope:	{
				resultTemplate: "&"
			},
			restrict: "E",
			templateUrl: "/assets/views/directives/basicSearch.html",
			replace: true,
			link: function postLink(scope, iElement, iAttrs) {
				scope.multiple = typeof iAttrs["multiple"] !== "undefined";

				scope.query = "";
				scope.results = [];

				/** open search element or not **/
				var focused = false, clicked = false;
				var input = jQuery('<input type="text" class="searchQuery"  data-ng-keydown="keydown($event)" data-ng-change="queryChange()" data-ng-model="query" data-onfocus="focus(true)" data-onblur="focus(false)">');

				var attr, attrName;
				for (attr in iAttrs) {
					if (iAttrs.hasOwnProperty(attr)) {
						if (attr.match(/^input/)) {
							attrName = attr.replace(/^input/, "").replace(/([a-z])([A-Z])/g, "$1-$2");
							input.attr("data-" + attrName, iAttrs[attr]);
						}
					}
				}

				$compile(input)(scope);
				iElement.find(".searchField").append(input);


				jQuery(document.body).click(function () {
					$timeout(function () {
						scope.click(false);
					});
				});

				scope.show = function () {
					return (focused || clicked) && scope.results.length > 0;
				};

				scope.click = function (bool) {
					if (bool) {
						input.focus();
					}
					clicked = bool;
				};

				scope.focus = function (bool) {
					focused = bool;
				};

				/** suchergebnisse laden */
				var realResults = [];

				function filterRealResults() {
					return realResults.filter(function (val) {
						return selectedIDs.indexOf(val.id) === -1;
					});
				}

				scope.searching = false;
				scope.empty = false;

				scope.queryChange = function queryChange() {
					scope.searching = true;
					scope.$emit("queryChange", scope.query);
				};

				scope.$on("initialSelection", function (event, results) {
					scope.selectedElements = results.map(function (e) {
						return {
							result: e,
							id: e.id,
							name: e.name
						};
					});
					selectedIDs = results.map(function (e) {
						return e.id;
					});

					scope.results = filterRealResults();
				});

				scope.$on("queryResults", function (event, results) {
					scope.searching = false;
					realResults = results;
					scope.results = filterRealResults();
					var width = iElement.width();
					iElement.find(".searchDrop").width(width);
				});

				scope.$on("resetSearch", function () {
					scope.query = "";
					scope.queryChange();
					scope.selectedElements = [];
				});

				/** suchergebnisse markieren */
				scope.current = 0;

				function addCurrent(val) {
					scope.setCurrent(scope.current + val);
				}

				scope.setCurrent = function (val) {
					scope.current = val;

					if (scope.current < 0) {
						scope.current = 0;
					}

					if (scope.current > scope.results.length - 1) {
						scope.current = scope.results.length - 1;
					}
				};

				scope.currentClass = function (i) {
					if (i === scope.current) {
						return "active";
					}

					return "";
				};

				/** suchergebnisse auswählen und hinzufügen */

				var selectedIDs = [];
				scope.selectedElements = [];

				scope.selectResult = function(index) {
					var result = scope.results[index];
					if (scope.multiple) {
						var name = result.name;
						var id = result.id;

						if (selectedIDs.indexOf(id) === -1) {
							scope.selectedElements.push({
								result: result,
								id: id,
								name: name
							});
							selectedIDs.push(id);
							scope.results = filterRealResults();
							scope.setCurrent(scope.current);

							scope.$emit("elementSelected", result);
							scope.$emit("selectionChange", scope.selectedElements);
						}

						scope.query = "";
						scope.queryChange();
					} else {
						scope.$emit("elementSelected", result);

						scope.click(false);
						scope.focus(false);
					}
				};

				scope.markedForDeletion = -1;

				scope.removeSelection = function (index) {
					scope.$emit("elementRemoved", scope.selectedElements[index]);
					scope.selectedElements.splice(index, 1);
					selectedIDs.splice(index, 1);
					scope.markedForDeletion = -1;
					scope.results = filterRealResults();
				};

				/** key stuff */

				var UP = [38, 33];
				var DOWN = [40, 34];
				var ENTER = [13];
				var BACKSPACE = 8;

				// left: 37, up: 38, right: 39, down: 40,
				// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
				var keys = UP.concat(DOWN);

				scope.keydown = function (e) {
					if (UP.indexOf(e.keyCode) > -1) {
						addCurrent(-1);
					}

					if (DOWN.indexOf(e.keyCode) > -1) {
						addCurrent(1);
					}

					if (e.keyCode == BACKSPACE && scope.query.length === 0) {
						if (scope.markedForDeletion !== -1) {
							scope.removeSelection(scope.markedForDeletion);
						} else {
							scope.markedForDeletion = scope.selectedElements.length - 1;
						}
					}

					if (e.keyCode == ENTER) {
						scope.selectResult(scope.current);
					}

					if (keys.indexOf(e.keyCode) > -1) {
						e.preventDefault();
					}
				};

				scope.queryChange();
			}
		};
	}

	return searchDirective;
});