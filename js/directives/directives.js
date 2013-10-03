/**
* BaseDirective
**/

var directives = ["eatClick", "blur", "onblur", "friend", "strgEnter", "onfocus", "comment", "post", "scroll", "file", "stopEvent", "inview", "syntaxify"];

var includes = ["angular", "directives/search"];

var i;
for (i = 0; i < directives.length; i += 1) {
	includes.push("directives/" + directives[i]);
}

define(includes, function (angular, search) {
	"use strict";

	var d = angular.module("ssn.directives",[]);

	var i;
	for (i = 0; i < directives.length; i += 1) {
		d.directive(directives[i], arguments[i+2]);
	}

	d.directive("search", ["ssn.userService", "$location", "$timeout", search]);

	return d;
});

