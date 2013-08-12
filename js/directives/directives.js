/**
* BaseDirective
**/
 
define(["angular", "directives/eatClick", "directives/onBlur", "directives/friend", "directives/strgEnter"], function (angular, eatClick, onBlur, friend, strgEnter) {
	"use strict";

	var directives = angular.module("ssn.directives",[]);
	directives.directive("eatClick", eatClick);
	directives.directive("ngModelOnblur", onBlur);
	directives.directive("friend", friend);
	directives.directive("enter", strgEnter);

	return directives;
});