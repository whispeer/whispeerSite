/**
directive to eat clicks.
stops event default, mainly necessary for links
**/
define(["jquery", "directives/directivesModule"], function (jQuery, directivesModule) {
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
