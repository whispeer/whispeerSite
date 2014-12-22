define(["jquery", "qtip"], function (jQuery) {
	"use strict";
	var directive =  function(localize) {
		return {
			restrict: "A",
			link: function(scope, elm, attrs) {
				var show = true;

				if (attrs.errorHint) {
					scope.$watch(attrs.errorHint, function (value) {
						show = value;
					});
				}

				var showWhen = {
					ready: true
				};
				var hideWhen = false;

				if (attrs.errorHintEvent) {
					showWhen = {
						event: attrs.errorHintEvent
					};
					hideWhen = {};
				}

				scope.$watch(function () {
					if (!show) {
						return false;
					}

					var i;
					for (i = 1; i <= 10; i += 1) {
						if (attrs["errorHintF" + i] && scope.$eval(attrs["errorHintF" + i])) {
							return i;
						}
					}

					return false;
				}, function (value) {
					if (value) {
						elm.qtip({ // Grab some elements to apply the tooltip to
							content: {
								text: localize.getLocalizedString(attrs["errorHintT" + value]),
							},
							style: {
								classes: 'qtip-bootstrap'
							},
							position: {
								my: 'top center',
								at: 'bottom center'
							},
							show: showWhen,
							hide: hideWhen
						});
					} else {
						elm.qtip('destroy', true);
					}
				});
			}
		};
	};

	directive.$inject = ["localize"];

	return directive;
});
