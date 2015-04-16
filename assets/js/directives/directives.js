/**
* BaseDirective
**/

define(["angular", "directives/basicDirectives", "directives/scrollToID"],
		function (angular, d, circleSearch, filterSearch, scrollToID) {
	"use strict";

	d.directive("scrolltoid", ["$location", "$anchorScroll", scrollToID]);

	return d;
});

