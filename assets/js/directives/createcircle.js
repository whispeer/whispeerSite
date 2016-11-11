var templateUrl = require("../../views/directives/createcircle.html");

define(["bluebird", "directives/directivesModule"], function (Bluebird, directivesModule) {
	"use strict";

	function createcircle(circleService) {
		return {
			scope: {
				"name": "=",
				"afterCreate": "&"
			},
			restrict: "E",
			templateUrl: templateUrl,
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

	directivesModule.directive("createcircle", createcircle);
});
