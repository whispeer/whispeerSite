define(["whispeerHelper", "step"], function (h) {
	"use strict";

	function passwordSaver(sessionHelper) {
		return {
			scope:	{
				state: "=state"
			},
			restrict: "E",
			template: 
				"<div class='annotatedInput-container'>" +
				"	<input class='annotatedInput-input strenghInput password' type='password' data-i18n-attr='login.password|placeholder' data-ng-model='state.password' validation='passwordValidations'>" +
				"	<span class='annotatedInput-icon' data-strength='{{passwordStrength()}}'></span>" +
				"</div>" +
				"<div class='annotatedInput-container'>" +
				"	<input type='password' class='annotatedInput-input password2' data-i18n-attr='login.register.repeatPassword|placeholder' data-ng-model='state.password2' validation='password2Validations'>" +
				"	<span class='annotatedInput-icon fa' data-ng-class='acceptIcon(state.password, state.password2)' data-ng-if='!empty(state.password) && !empty(state.password2)'></span>" +
				"</div>",
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

				scope.acceptIcon = function (value1, value2) {
					if (value1 === value2) {
						return "fa-check";
					}

					return "fa-times";
				};


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