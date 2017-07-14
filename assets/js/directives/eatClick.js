"use strict";

/**
directive to eat clicks.
stops event default, mainly necessary for links
**/
const jQuery = require("jquery");
const directivesModule = require("directives/directivesModule");

function eatClickDirective() {
	return function(scope, element) {
		jQuery(element).click(function(event) {
			event.preventDefault();
		});
	};
}

directivesModule.directive("eatClick", eatClickDirective);
