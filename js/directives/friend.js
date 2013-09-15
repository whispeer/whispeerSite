define(function () {
	'use strict';

	function friendDirective() {
		return {
			transclude: true,
			scope:	{
				userData: "=user"
			},
			restrict: 'E',
			templateUrl: '/views/directives/friend.html',
			replace: true
		};			
	}

	return friendDirective;
});