/**
* BaseDirective
**/

var directives = ["eatClick", "blur", "onblur", "friend", "strgEnter", "onfocus", "comment", "post", "scroll", "file", "stopEvent", "inview", "syntaxify", "basicsearch"];

var includes = ["angular", "directives/usersearch"];

var i;
for (i = 0; i < directives.length; i += 1) {
	includes.push("directives/" + directives[i]);
}

console.log(JSON.stringify(includes));

define(includes, function (angular, userSearch) {
	"use strict";

	var d = angular.module("ssn.directives",[]);

	var i;
	for (i = 0; i < directives.length; i += 1) {
		d.directive(directives[i], arguments[i+2]);
	}

	d.directive("usersearch", ["ssn.userService", "$location", userSearch]);

	return d;
});

