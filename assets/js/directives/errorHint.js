 //class="hint--right hint--error hint--always" data-hint=""

 define(["jquery"], function (jQuery) {
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

				//errorHintF
				//errorHintT
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
					var lineBreak = jQuery("<div/>").html("&#xa;").text();

					if (value) {
						elm.addClass("hint--right hint--error hint--always")
							.attr("data-hint", localize.getLocalizedString(attrs["errorHintT" + value]).replace("[br]", lineBreak));
					} else {
						elm.removeClass("hint--right hint--error hint--always")
							.removeAttr("data-hint");
					}
				});
			}
		};
	};

	directive.$inject = ["localize"];

	return directive;
});
