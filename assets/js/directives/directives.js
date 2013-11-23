/**
* BaseDirective
**/

var directives = ["eatClick", "blur", "onblur", "friend", "strgEnter", "enter", "onfocus", "comment", "post", "scroll", "file", "stopEvent", "inview", "syntaxify", "basicsearch", "autofocus"];

var includes = ["angular", "directives/usersearch", "directives/circlesearch"];

var i;
for (i = 0; i < directives.length; i += 1) {
	includes.push("directives/" + directives[i]);
}

console.log(JSON.stringify(includes));

define(includes, function (angular, userSearch, circleSearch) {
	"use strict";

	var d = angular.module("ssn.directives",[]);

	var i;
	for (i = 0; i < directives.length; i += 1) {
		d.directive(directives[i], arguments[i+3]);
	}

	d.directive("usersearch", ["ssn.userService", "$location", userSearch]);
	d.directive("circlesearch", ["ssn.userService", "$location", "ssn.circleService", circleSearch]);

	return d;
});

