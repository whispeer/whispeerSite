define(["whispeerHelper", "directives/directivesModule", "qtip"], function (h, directivesModule) {
	"use strict";

	var elements = [];

	function validatedForm(localize) {
		return {
			scope:	false,
			restrict: "A",
			link: function (scope, iElement, iAttr) {
				var options = scope.$eval(iAttr.validatedForm);

				function getElementScope(element) {
					if (typeof element.scope() === "function" && element.scope()) {
						return element.scope();
					} else {
						return element.data("scopeFallback");
					}
				}

				var validations = [];
				iElement.find("[validation]").each(function (i, e) {
					var element = jQuery(e);
					validations.push({
						element: element,
						validator: element.attr("validation"),
						validations: []
					});
				});

				function validateOnChange(vElement, validation) {
					vElement.element.on("keyup", h.debounce(function () {
						if (getElementScope(vElement.element).$eval(validation.validator)) {
							showErrorHint(vElement.element, validation);
						}
					}, validation.onChange));
				}

				function registerChangeListener(vElement) {
					vElement.validations.forEach(function (validation) {
						if (validation.onChange) {
							validateOnChange(vElement, validation);
						}
					});
				}

				//expand all validations
				validations.forEach(function (vElement) {
					var scope = getElementScope(vElement.element);
					var deregister = scope.$watch(function () {
						return scope.$eval(vElement.validator);
					}, function (val) {
						if (val) {
							vElement.validations = val;
							registerChangeListener(vElement);
							deregister();
						}
					});
				});

				var activeFailedValidation = false;

				function removeErrorHints() {
					activeFailedValidation = false;
					validations.forEach(function (vElement) {
						vElement.element.qtip("destroy", true);
					});
				}

				function showErrorHint(element, failedValidation) {
					if (failedValidation === activeFailedValidation) {
						return;
					} else if (activeFailedValidation) {
						removeErrorHints();
					}

					activeFailedValidation = failedValidation;

					var showWhen = {
						ready: true
					};
					var hideWhen = false;

					element.qtip({
						content: {
							text: localize.getLocalizedString(failedValidation.translation),
						},
						style: {
							classes: "qtip-bootstrap"
						},
						position: {
							my: "top center",
							at: "bottom center"
						},
						show: showWhen,
						hide: hideWhen
					});
				}

				function checkValidations() {
					var invalidValidationFound = false;

					//run all validations and show errors in qtips.

					validations.forEach(function (vElement) {
						if (invalidValidationFound) { return; }

						var scope = getElementScope(vElement.element);
						vElement.validations.forEach(function (validation) {
							if (invalidValidationFound) { return; }

							if (scope.$eval(validation.validator)) {
								invalidValidationFound = true;
								showErrorHint(vElement.element, validation);
							}
						});
					});

					if (!invalidValidationFound) {
						removeErrorHints();
					}

					return invalidValidationFound;
				}

				if (options.validateOnCallback) {
					options.checkValidations = function () {
						return checkValidations();
					};
				} else {
					scope.$watch(function () {
						checkValidations();

						return "";
					}, function () {});
				}

				if (options.hideOnInteraction) {
					iElement.on("click keydown", "input", removeErrorHints);
				}
			}
		};
	}

	validatedForm.$inject = ["localize"];

	directivesModule.directive("validatedForm", validatedForm);

	directivesModule.directive("validation", function () {
		return {
			scope:	false,
			restrict: "A",
			link: function (scope, iElement) {
				elements.push(iElement);
				iElement.data("scopeFallback", scope);
			}
		};
	});
});
