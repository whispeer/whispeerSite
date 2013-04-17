
define(function () {
	'use strict';

	function eatClickDirective() {
		return function(scope, element, attrs) {
			$(element).click(function(event) {
				event.preventDefault();
			});
		}
	}

	return eatClickDirective;
});