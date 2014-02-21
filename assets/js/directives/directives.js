/**
* BaseDirective
**/

define(["angular", "directives/basicDirectives", "directives/usersearch", "directives/circlesearch", "directives/filtersearch", "directives/scrollToID"],
		function (angular, d, userSearch, circleSearch, filterSearch, scrollToID) {
	"use strict";

	d.directive("usersearch", ["ssn.userService", "$location", "$timeout", userSearch]);
	d.directive("circlesearch", ["ssn.userService", "$timeout", "ssn.circleService", circleSearch]);
	d.directive("filtersearch", ["ssn.userService", "$timeout", "ssn.circleService", "localize", filterSearch]);
	d.directive("scrolltoid", ["$location", "$anchorScroll", scrollToID]);

	return d;
});

