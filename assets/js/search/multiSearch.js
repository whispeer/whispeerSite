define([], function () {
	"use strict";

	return function ($injector, scope, iElement, iAttrs) {
		var selectedIDs = [];
		scope.selectedElements = [];
		scope.previewCount = 0;
		scope.hiddenCount = 0;

		var $timeout = $injector.get("$timeout");

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

		scope.selectResult = function(index) {
			var result = scope.results[index];

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

			$timeout(updatePreviewCount);

			scope.results = filterSelectedResults();
			scope.callback(scope.selectedElements.map(function (e) {
				return e.id;
			}));
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

	};
});
