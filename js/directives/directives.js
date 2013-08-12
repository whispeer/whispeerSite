/**
* BaseDirective
**/
 
define(["angular", "directives/eatClick", "directives/onBlur", "directives/friend", "directives/strgEnter", "directives/onfocus", "directives/post", "directives/comment"], function (angular, eatClick, onBlur, friend, strgEnter, focus, post, comment) {
	"use strict";

	var directives = angular.module("ssn.directives",[]);
	directives.directive("eatClick", eatClick);
	directives.directive("ngModelOnblur", onBlur);
	directives.directive("friend", friend);
	directives.directive("enter", strgEnter);
	directives.directive("onfocus", focus);
	directives.directive("post", post);
	directives.directive("comment", comment);

	return directives;
});