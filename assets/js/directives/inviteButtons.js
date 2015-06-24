define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function newPostDirective() {
		return {
			scope: {},
			restrict: "E",
			templateUrl: "assets/views/directives/inviteButtons.html",
			replace: false,
			transclude: false,
			controller: "ssn.inviteController"
		};
	}

	newPostDirective.$inject = [];

	directivesModule.directive("invitebuttons", newPostDirective);
});
