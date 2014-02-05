/**
* BaseDirective
**/

var directives = ["eatClick", "blur", "onblur", "friend", "strgEnter", "enter", "onfocus", "comment", "post", "scroll", "file", "stopEvent", "inview", "syntaxify", "basicsearch", "autofocus"];

var includes = ["angular", "directives/usersearch", "directives/circlesearch", "directives/filtersearch", "directives/scrollToID"];

var i;
for (i = 0; i < directives.length; i += 1) {
	includes.push("directives/" + directives[i]);
}

console.log(JSON.stringify(includes));

define(includes, function (angular, userSearch, circleSearch, filterSearch, scrollToID) {
	"use strict";

	var d = angular.module("ssn.directives",[]);

	var i;
	for (i = 0; i < directives.length; i += 1) {
		d.directive(directives[i], arguments[i+4]);
	}

	d.directive("usersearch", ["ssn.userService", "$location", "$timeout", userSearch]);
	d.directive("circlesearch", ["ssn.userService", "$timeout", "ssn.circleService", circleSearch]);
	d.directive("filtersearch", ["ssn.userService", "$timeout", "ssn.circleService", "localize", filterSearch]);
	d.directive("scrollToID", ["$location", "$anchorScroll", scrollToID]);

	return d;
});

