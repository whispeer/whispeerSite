define(function () {
	'use strict';

	function friendDirective() {
		return {
			transclude: true,
			scope:	{
				userData: "=user"
			},
			restrict: 'E',
			template: '<div class="pushup"><p class="username">{{userData.name}}</p><p class="mutualfriends" data-i18n="friends.mutualFriends|count={{userData.samefriends}}"></p></div>',
			replace: true
		};			
	}

	return friendDirective;
});