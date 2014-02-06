/**
* BaseDirective
**/

var directives = ["eatClick", "blur", "onblur", "friend", "strgEnter", "enter", "onfocus", "comment", "post", "scroll", "file", "stopEvent", "inview", "syntaxify", "basicsearch", "autofocus"];

var includes = ["angular"];

var i;
for (i = 0; i < directives.length; i += 1) {
	includes.push("directives/" + directives[i]);
}

console.log(JSON.stringify(includes));

define(includes, function (angular) {
	"use strict";

	var d = angular.module("ssn.directives",[]);

	var i;
	for (i = 0; i < directives.length; i += 1) {
		d.directive(directives[i], arguments[i+1]);
	}

	return d;
});

