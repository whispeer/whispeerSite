define([], function () {
	"use strict";

	return function () {
		return {
			compile: function () {
				return {
					post: function (scope, elm, attrs) {
						var wasInView = false, timer = 0;

						var inviewTime = attrs.inviewTime || 0;

						function check() {
							var parent = elm.parent();

							if (parent.length > 0) {
								var top = elm.offset().top - parent.offset().top;
								var height = elm[0].offsetHeight;

								var parentHeight = parent.height();

								if (top > 0 && top + height < parentHeight) {
									if (attrs.inview && !wasInView) {
										wasInView = true;
										timer = window.setTimeout(function () {
											scope.$eval(attrs.inview);
										}, inviewTime);
									}
								} else {
									if (timer) {
										window.clearTimeout(timer);
										timer = 0;
									}

									wasInView = false;
								}
							} else {
								//TODO remove listener
							}
						}

						window.setTimeout(check, 500);

						elm.parent().bind("scroll", check);
					}
				};
			}
		};
	};
});