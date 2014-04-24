define(function () {
	'use strict';

	function friendDirective() {
		return {
			transclude: false,
			scope:	{
				userData: "=user"
			},
			restrict: 'E',
			templateUrl: '/assets/views/directives/friend.html',
			replace: true
		};
	}

	return friendDirective;
});