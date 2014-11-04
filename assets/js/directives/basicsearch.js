define(["step", "whispeerHelper"], function () {
	"use strict";

	function searchDirective($timeout, $compile) {
		return {
			scope: {
				"res": "=",
				"base": "@"
			},
			/* this is an element */
			restrict: "E",
			templateUrl: "assets/views/directives/basicSearch.html",
			/* replace given element */
			replace: true,
			transclude: true,
			link: function postLink(scope, iElement, iAttrs) {
				scope.circles = {
					selectedElements: []
				};

				scope.showSelectedElements = false;
				scope.toggleShowSelectedElements = function (bool, $event) {
					if ($event) {
						$event.stopPropagation();
						$event.preventDefault();
					}

					if (bool) {
						internallyClicked = true;
						scope.showSelectedElements = !scope.showSelectedElements;
						focused = false;
						clicked = false;
						$timeout(function () {
							internallyClicked = false;
						});
					}
					initialize();
				};

				scope.resultAttribute = iAttrs.resAttr || "selectedElements";
				scope.multiple = iAttrs.multiple !== undefined;
				scope.big = iAttrs.size === "big";

				var oldQuery = "", internallyClicked = false;
				/* attribute to define if we want multiple results or one */
				scope.query = "";
				scope.results = [];

				/** open search element or not **/
				var focused = false, clicked = false, initialized = false;

				/* we need to build the input on our own to be able to add custom attributes */
				var input = jQuery('<input type="text" class="search-query input-custom" data-ng-click="click(true, $event)"  data-ng-keydown="keydown($event)" data-ng-change="queryChange()" data-ng-model="query" data-onfocus="focus(true)" data-onblur="focus(false)">');

				/* add attributes on outer element starting with input- to the inner input */
				var attr, attrName;
				for (attr in iAttrs) {
					if (iAttrs.hasOwnProperty(attr)) {
						if (attr.match(/^input/)) {
							attrName = attr.replace(/^input/, "").replace(/([a-z])([A-Z])/g, "$1-$2");
							input.attr("data-" + attrName, iAttrs[attr]);
						}
					}
				}

				/* compile & append input */
				$compile(input)(scope);
				iElement.find(".search-input").append(input);

				function initialize() {
					if (!initialized) {
						initialized = true;
						scope.queryChange(true);
					}
				}

				/* close on body click */
				jQuery(document.body).click(function () {
					$timeout(function () {
						if (!internallyClicked) {
							scope.hide();
						}

						internallyClicked = false;
					});
				});

				scope.notifyParent = function (eventName, attr) {
					scope.$emit(eventName, attr);
				};

				scope.width = iElement.width();

				scope.show = function () {
					return (focused || clicked);
				};

				scope.hide = function () {
					scope.focus(false);
					scope.click(false);
					scope.showSelectedElements = false;
				};

				scope.click = function (bool, $event) {
					if ($event) {
						$event.stopPropagation();
						$event.preventDefault();
					}

					if (bool) {
						internallyClicked = true;
						input.focus();
						$timeout(function () {
							internallyClicked = false;
						});
					}
					clicked = bool;
					initialize();
				};

				scope.focus = function (bool) {
					focused = bool;
					scope.showSelectedElements = false;
					initialize();
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

				scope.queryChange = function queryChange(noDiffNecessary) {
					if (noDiffNecessary || oldQuery !== scope.query) {
						oldQuery = scope.query;
						scope.searching = true;
						scope.$emit("queryChange", scope.query);
					}

					if (oldQuery !== scope.query) {
						scope.click(true);
					}
				};

				scope.$on("hide", function () {
					scope.hide();
				});

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

					selectionUpdated();
				});

				scope.$on("queryResults", function (event, results) {
					scope.searching = false;
					realResults = results;
					scope.results = filterRealResults();
				});

				scope.$on("resetSearch", function () {
					scope.query = "";
					scope.queryChange(true);
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
						return "search-suggestions-active";
					}

					return "";
				};

				/** suchergebnisse auswählen und hinzufügen */

				var internalid = iAttrs.internalid;
				var selectedIDs = [];
				scope.selectedElements = [];
				scope.previewCount = 0;
				scope.hiddenCount = 0;

				function decreasePreviewCount() {
					var INPUTWIDTH = 100;

					var element = iElement.find(".inputWrap");
					var availableWidth = element.innerWidth();

					var selectedWidth = 0;
					element.find(".searchResult").each(function (i , e) {
						e = jQuery(e);
						//e.show();
						selectedWidth += e.outerWidth();
						//e.hide();
					});
					var plusWidth = 0;//element.find(".selected").outerWidth();

					var currentWidth = selectedWidth + plusWidth + INPUTWIDTH;

					if (currentWidth > availableWidth) {
						scope.previewCount = Math.max(0, scope.previewCount - 1);
						$timeout(decreasePreviewCount);
					}

					scope.hiddenCount = Math.max(0, scope.selectedElements.length - scope.previewCount);
				}

				function updatePreviewCount() {
					scope.previewCount = scope.selectedElements.length;

					$timeout(decreasePreviewCount);
				}

				function selectionUpdated(selection) {
					if (scope.multiple) {
						if (scope.res) {
							scope.res[scope.resultAttribute] = scope.selectedElements.map(function (e) {
								return e.id;
							});
						}

						scope.$emit("selectionChange", scope.selectedElements);
						scope.$emit("selectionChange:" + internalid, scope.selectedElements);

						scope.results = filterRealResults();

						updatePreviewCount();
					}

					if (selection) {
						scope.$emit("elementSelected", selection);
						scope.$emit("elementSelected:" + internalid, selection);
					}
				}

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

							scope.setCurrent(scope.current);
						}

						scope.query = "";
						scope.queryChange(true);
					} else {
						scope.click(false);
						scope.focus(false);
					}

					selectionUpdated(result);
				};

				scope.markedForDeletion = -1;

				scope.removeSelection = function (index, $event) {
					if ($event) {
						$event.stopPropagation();
						$event.preventDefault();
					}

					scope.$emit("elementRemoved", scope.selectedElements[index]);
					scope.selectedElements.splice(index, 1);
					selectedIDs.splice(index, 1);
					scope.markedForDeletion = -1;

					selectionUpdated();
				};

				/** key stuff */

				var UP = [38, 33];
				var DOWN = [40, 34];
				var ENTER = 13;
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

					if (e.keyCode === BACKSPACE && scope.query.length === 0) {
						if (scope.markedForDeletion !== -1) {
							scope.removeSelection(scope.markedForDeletion);
						} else {
							scope.markedForDeletion = scope.selectedElements.length - 1;
						}
					}

					if (e.keyCode === ENTER) {
						scope.selectResult(scope.current);
					}

					if (keys.indexOf(e.keyCode) > -1) {
						e.preventDefault();
					}
				};
			}
		};
	}

	searchDirective.$inject = ["$timeout", "$compile"];

	return searchDirective;
});