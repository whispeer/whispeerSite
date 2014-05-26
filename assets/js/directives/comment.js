define(function () {
	'use strict';

	function commentDirective() {
		return {
			transclude: true,
			scope:	{
				comment: "=comment"
			},
			restrict: 'E',
			templateUrl: 'assets/views/directives/comment.html',
			replace: true
		};			
	}

	return commentDirective;
});