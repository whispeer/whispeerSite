define(function () {
	'use strict';

	function postDirective() {
		return {
			transclude: true,
			scope:	{
				post: "=post"
			},
			restrict: 'E',
			templateUrl: 'assets/views/directives/post.html',
			replace: true
		};			
	}

	return postDirective;
});