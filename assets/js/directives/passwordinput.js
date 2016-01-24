define(["whispeerHelper", "directives/directivesModule", "services/passwordStrengthService"], function (h, directivesModule) {
	"use strict";

	function passwordSaver(passwordStrengthService) {
		return {
			scope:	{
				state: "=passwordinput"
			},
			transclude: true,
			restrict: "E",
			link: function (scope, element, attrs, ctrl, transclude) {
				transclude(scope, function(clone) {
					element.append(clone);
				});

				scope.passwordValidations = [
					{
						validator: "passwordEmpty()",
						translation: "login.register.errors.passwordEmpty"
					},
					{
						validator: "passwordToWeak()",
						translation: "login.register.errors.passwordWeak",
						onChange: 500
					}
				];

				scope.password2Validations = [
					{
						validator: "password2Empty()",
						translation: "login.register.errors.password2Empty"
					},
					{
						validator: "noPasswordMatch()",
						translation: "login.register.errors.passwordNoMatch"
					}
				];

				scope.state = scope.state || {};

				scope.acceptIcon = function (value1, value2) {
					if (value1 === value2) {
						return "fa-check";
					}

					return "fa-times";
				};


				scope.passwordStrength = function () {
					return passwordStrengthService.passwordStrength(scope.state.password);
				};

				scope.empty = function (val) {
					return val === "" || !h.isset(val);
				};

				scope.passwordEmpty = function () {
					return scope.empty(scope.state.password);
				};

				scope.passwordToWeak = function () {
					return scope.passwordStrength() < 1;
				};

				scope.password2Empty = function () {
					return scope.empty(scope.state.password2);
				};

				scope.noPasswordMatch = function () {
					return scope.state.password !== scope.state.password2;
				};
			}
		};
	}

	passwordSaver.$inject = ["ssn.passwordStrengthService"];

	directivesModule.directive("passwordinput", passwordSaver);
});
