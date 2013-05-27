/**
* BaseDirective
**/
 
define(['angular', 'directives/eatClick', 'directives/onBlur'], function (angular, eatClick, onBlur) {
	var directives = angular.module('ssn.directives',[]);
	directives.directive('eatClick', eatClick);
	directives.directive('ngModelOnblur', onBlur);

	return directives;
});