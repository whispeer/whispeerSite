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

				var activeFailedValidation = false;

				function removeErrorHints(e) {
					if (e && e.keyCode === 13) {
						return;
					}

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

					if (!failedValidation.translation) {
						return;
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

				function checkValidations(ids, skipHints) {
					var invalidValidationFound = false;

					//run all validations and show errors in qtips.

					validations.forEach(function (vElement) {
						if (ids && ids.indexOf(vElement.element.attr("id")) === -1) { return; }
						if (invalidValidationFound) { return; }

						var scope = getElementScope(vElement.element);
						vElement.validations.forEach(function (validation) {
							if (invalidValidationFound) { return; }

							if (scope.$eval(validation.validator)) {
								invalidValidationFound = true;
								if (!skipHints) {
									showErrorHint(vElement.element, validation);
								}
							}
						});
					});

					if (!invalidValidationFound && !skipHints) {
						removeErrorHints();
					}

					return invalidValidationFound;
				}

				if (options.validateOnCallback) {
					options.checkValidations = checkValidations;
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
				iElement.data("scopeFallback", scope);
			}
		};
	});
});
