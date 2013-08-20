/**
* BaseDirective
**/

var directives = ["eatClick", "blur", "onblur", "friend", "strgEnter", "onfocus", "comment", "post", "scroll", "file"];

var includes = ["angular"];

var i;
for (i = 0; i < directives.length; i += 1) {
	includes.push("directives/" + directives[i]);
}

define(includes, function (angular) {
	"use strict";

	var d = angular.module("ssn.directives",[]);

	var i;
	for (i = 0; i < directives.length; i += 1) {
		d.directive(directives[i], arguments[i+1]);
	}

	return d;
});