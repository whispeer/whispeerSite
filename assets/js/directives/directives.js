/**
* BaseDirective
**/

define(["angular", "directives/basicDirectives", "directives/circlesearch", "directives/filtersearch", "directives/scrollToID"],
		function (angular, d, userSearch, circleSearch, filterSearch, scrollToID) {
	"use strict";

	d.directive("circlesearch", ["ssn.userService", "$timeout", "ssn.circleService", circleSearch]);
	d.directive("filtersearch", ["ssn.keyStoreService", "ssn.userService", "$timeout", "ssn.circleService", "localize", filterSearch]);
	d.directive("scrolltoid", ["$location", "$anchorScroll", scrollToID]);

	return d;
});

