/**
* BaseDirective
**/
 
define(['angular', 'directives/eatClick', 'directives/onBlur', 'directives/friend'], function (angular, eatClick, onBlur, friend) {
	var directives = angular.module('ssn.directives',[]);
	directives.directive('eatClick', eatClick);
	directives.directive('ngModelOnblur', onBlur);
	directives.directive('friend', friend);

	return directives;
});