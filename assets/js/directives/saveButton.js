define(function () {
	'use strict';

	function savebuttonDirective() {
		return {
			transclude: true,
			scope:	{
				success:		"=success",
				operation:		"=operation",
				failure:		"=failure",
			},
			restrict: 'E',
			templateUrl: '/assets/views/directives/saveButton.html',
			replace: true,
			link: function (scope, iElement, iAttrs) {
				if (iAttrs["defaulticon"] === undefined) {
					scope.defaulticon = "icon-ok-circle";
				} else {
					scope.defaulticon = iAttrs["defaulticon"];
				}
			}
		};			
	}

	return savebuttonDirective;
});