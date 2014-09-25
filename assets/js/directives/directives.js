/**
* BaseDirective
**/

define(["angular", "directives/basicDirectives", "directives/usersearch", "directives/circlesearch", "directives/filtersearch", "directives/scrollToID", "directives/imageGallery"],
		function (angular, d, userSearch, circleSearch, filterSearch, scrollToID, imageGallery) {
	"use strict";

	d.directive("usersearch", ["ssn.errorService", "ssn.circleService", "ssn.userService", "ssn.friendsService", "$location", "$timeout", userSearch]);
	d.directive("circlesearch", ["ssn.userService", "$timeout", "ssn.circleService", circleSearch]);
	d.directive("filtersearch", ["ssn.keyStoreService", "ssn.userService", "$timeout", "ssn.circleService", "localize", filterSearch]);
	d.directive("scrolltoid", ["$location", "$anchorScroll", scrollToID]);
	d.directive("gallery", ["ssn.errorService", "ssn.blobService", imageGallery]);

	return d;
});

