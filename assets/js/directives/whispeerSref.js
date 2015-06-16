/**
directive to update href references
**/
define(["directives/directivesModule", "angular"], function (directivesModule, angular) {
	"use strict";

	function whispeerSref($state, $rootScope, localize) {
		return {
			restrict: "A",
			link: function(scope, element, attrs) {
				var link = attrs.whispeerSref, params, stateName;

				function parseStateRef(ref) {
					var parsed;
					parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);

					if (!parsed || parsed.length !== 4) {
						throw new Error("Invalid state ref '" + ref + "'");
					}

					return {
						state: parsed[1],
						paramExpr: parsed[3]
					};
				}

				function updateHref() {
					params.locale = localize.getLanguage();

					var destination = $state.href(stateName, params);

					element.attr("href", destination);
				}

				function checkActiveState() {
					if ($state.current.name === stateName) {
						element.addClass(attrs.whispeerSrefActive);
					} else {
						element.removeClass(attrs.whispeerSrefActive);
					}
				}

				var ref = parseStateRef(link);
				stateName = ref.state;

				if (ref.paramExpr) {
					scope.$watch(ref.paramExpr, function(newValue) {
						params = newValue;
						updateHref();
					}, true);
					params = angular.copy(scope.$eval(ref.paramExpr));
				} else {
					params = {};
				}

				$rootScope.$on("localizeResourcesUpdates", updateHref);

				updateHref();

				if (attrs.whispeerSrefActive) {
					$rootScope.$on("$stateChangeSuccess", checkActiveState);
					checkActiveState();
				}

			}
		};
	}

	directivesModule.directive("whispeerSref", ["$state", "$rootScope", "localize", whispeerSref]);
});
