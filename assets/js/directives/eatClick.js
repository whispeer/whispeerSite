/**
directive to eat clicks.
stops event default, mainly necessary for links
**/
define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	function eatClickDirective() {
		return function(scope, element) {
			jQuery(element).click(function(event) {
				event.preventDefault();
			});
		};
	}

	directivesModule.directive("eatClick", eatClickDirective);
});
