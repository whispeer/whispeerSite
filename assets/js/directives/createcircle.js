define(["bluebird"], function (Bluebird) {
	"use strict";

	function createcircle(circleService) {
		return {
			scope: {
				"name": "=",
				"afterCreate": "&"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/createcircle.html",
			replace: false,
			transclude: false,
			link: function (scope) {
				scope.createCircle = function (name) {
					var createCircle = Bluebird.promisify(circleService.create, circleService);

					createCircle(name).then(function (circle) {
						scope.afterCreate({
							circle: circle
						});
					});
				};
			}
		};
	}

	createcircle.$inject = ["ssn.circleService"];

	return createcircle;
});
