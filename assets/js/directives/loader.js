var Bluebird = require("bluebird");

define(["whispeerHelper", "step", "directives/directivesModule"], function (h, step, directivesModule) {
	"use strict";

	// <loader data-model="user" data-ng-repeat="user in invite.usedBy" data-id="user" data-scope-attribute="user"> 

	function loaderDirective(userService, errorService) {
		return {
			restrict: "E",
			scope: {
				model: "@",
				id: "=",
				scopeAttribute: "@"
			},
			transclude: true,

			link: function(scope, element, attrs, ctrl, transclude) {
				scope.loading = true;
				scope.loaded = false;

				if (scope.model === "user") {
					Bluebird.try(function () {
						return userService.get(scope.id);
					}).then(function (user) {
						return user.loadBasicData().thenReturn(user);
					}).then(function (user) {
						scope[scope.scopeAttribute] = user.data;
						scope.loaded = true;
						scope.loading = false;
					}).catch(errorService.criticalError);
				}

				transclude(scope, function(clone) {
					element.append(clone);
				});
			}
		};
	}	

	directivesModule.directive("loader", ["ssn.userService", "ssn.errorService", loaderDirective]);

});
