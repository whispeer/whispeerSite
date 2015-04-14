define(["whispeerHelper"], function (h) {
	"use strict";

	return function ($injector, scope, iElement) {
		var selectedIDs = [];
		scope.selectedElements = [];
		scope.previewCount = 0;
		scope.hiddenCount = 0;

		var $timeout = $injector.get("$timeout");

		if (scope.initialValues) {
			scope.initialValues()().then(function (initialValues) {
				scope.selectedElements = initialValues.map(function (e) {
					return {
						result: e,
						id: e.id,
						name: e.name
					};
				});

				selectedIDs = initialValues.map(function (e) {
					return e.id;
				});

				scope.$apply();
				selectionUpdated();
			});
		}

		function updatePreviewCount() {
			var PLUSWIDTH = 55;

			scope.previewCount = scope.selectedElements.length;

			var element = iElement.find(".search-form");

			var availableWidth = element.innerWidth();

			var MININPUTWIDTH = ((availableWidth * 0.4) > 100) ? (availableWidth * 0.4) : 100;

			var selectedWidth = 0, found = false;
			element.find(".search-result").slice(0, -1).each(function (i , e) {
				if (!found) {
					e = jQuery(e);

					var wasHidden = e.hasClass("ng-hide");

					e.removeClass("ng-hide");

					var elementWidth = e.outerWidth();
					var takenWidth = selectedWidth + elementWidth + MININPUTWIDTH + PLUSWIDTH;

					if (takenWidth > availableWidth && i !== 0) {
						scope.previewCount = Math.max(0, i);
						found = true;
					} else {
						selectedWidth += elementWidth;
					}

					if (wasHidden) {
						e.addClass("ng-hide");
					}
				}
			});

			scope.hiddenCount = Math.max(0, scope.selectedElements.length - scope.previewCount);
			scope.remainingWidth = availableWidth - selectedWidth - (scope.hiddenCount > 0 ? PLUSWIDTH : 0);
		}
		 /* this has to run once since the input width would not be set for searches without selected elements */
		updatePreviewCount();

		scope.filter.push(function (results) {
			return results.filter(function (result) {
				return selectedIDs.indexOf(result.id) === -1;
			});
		});

		function selectionUpdated() {
			$timeout(updatePreviewCount);

			scope.results = scope.applyFilterToResults(scope.unFilteredResults);
			scope.setCurrent(scope.current);
			scope.callback()(selectedIDs);
		}

		scope.selectResult = function(result) {
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

			selectionUpdated();
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

		scope.$on("resetSearch", function () {
			scope.selectedElements = [];
			selectedIDs = [];
		});

		var BACKSPACE = [8];

		scope.keydown = h.addAfterHook(scope.keydown, function (e) {
			if (BACKSPACE.indexOf(e.keyCode) > -1 && scope.query.length === 0) {
				if (scope.markedForDeletion !== -1) {
					scope.removeSelection(scope.markedForDeletion);
				} else {
					scope.markedForDeletion = scope.selectedElements.length - 1;
				}

				e.preventDefault();
			}

		});

		scope.$watch(function () {
			return scope.show();
		}, function (show) {
			if (show) {
				scope.showSelectedElements = false;
			}
		});

		scope.showSelectedElements = false;
		scope.doShowSelectedElements = function (bool) {
			scope.showSelectedElements = bool;
			scope.hide();
		};

	};
});
