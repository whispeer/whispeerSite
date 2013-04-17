/**
* BaseDirective
**/
 
define(['angular', 'directives/eatClick'], function (angular, eatClick) {
	var directives = angular.module('ssn.directives',[]);
	directives.directive('eatClick', eatClick);

	return directives;
});