/**
* BaseDirective
**/

(function () {
	"use strict";
	var directives = ["smoothScroll", "eatClick", "blur", "onblur", "person", "strgEnter", "enter", "onfocus", "comment", "post", "scroll", "file", "stopEvent", "inview", "syntaxify", "basicsearch", "autofocus", "errorHint", "savebutton", "advancedsend", "focusMe", "userimage", "accessibleClick"];

	var includes = ["angular"];

	var i;
	for (i = 0; i < directives.length; i += 1) {
		includes.push("directives/" + directives[i]);
	}

	define(includes, function (angular) {
		var d = angular.module("ssn.directives",[]);

		var i;
		for (i = 0; i < directives.length; i += 1) {
			d.directive(directives[i], arguments[i+1]);
		}

		return d;
	});
})();