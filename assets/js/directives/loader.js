define(["whispeerHelper", "step", "directives/directivesModule"], function (h, step, directivesModule) {
	"use strict";

	// <loader data-model="user" data-ng-repeat="user in invite.usedBy" data-id="user" data-scope-attribute="user"> 

	function loaderDirective(userService) {
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
					var user;
					step(function () {
						userService.get(scope.id, this);
					}, h.sF(function (_user) {
						user = _user;
						user.loadBasicData(this);
					}), h.sF(function () {
						scope[scope.scopeAttribute] = user.data;
						scope.loaded = true;
						scope.loading = false;
					}));
				}

				transclude(scope, function(clone) {
					element.append(clone);
				});
			}
		};
	}	

	directivesModule.directive("loader", ["ssn.userService", loaderDirective]);

});
