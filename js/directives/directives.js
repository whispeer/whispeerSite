/**
* BaseDirective
**/

var directives = ["eatClick", "onBlur", "friend", "strgEnter", "onfocus"];

var includes = ["angular"];

var i;
for (i = 0; i < directives.length; i += 1) {
	includes.push("directives/" + directives[i]);
}
 
define(includes, function (angular) {
	"use strict";

	var directives = angular.module("ssn.directives",[]);

	var i;
	for (i = 0; i < directives.length; i += 1) {
		directives.directive("ssn." + directives[i], arguments[i+1]);
	}

	return directives;
});