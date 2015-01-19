define(["whispeerHelper", "step", "libs/qrreader"], function (h, step) {
	"use strict";

	function passwordSaver(sessionHelper) {
		return {
			scope:	{
				state: "=state"
			},
			restrict: "E",
			templateUrl: "assets/views/directives/passwordinput.html",
			link: function (scope) {
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

				scope.state.password = "";
				scope.state.password2 = "";

				scope.passwordStrength = function () {
					return sessionHelper.passwordStrength(scope.state.password);
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

	passwordSaver.$inject = ["ssn.sessionHelper"];

	return passwordSaver;
});