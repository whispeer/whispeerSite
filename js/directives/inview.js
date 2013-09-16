define([], function () {
	"use strict";

	return function () {
		return {
			compile: function () {
				return {
					post: function (scope, elm, attrs) {
						var wasInView = false, timer = 0;
						elm.parent().bind("scroll", function() {
							var parent = elm.parent();

							var top = elm.offset().top - parent.offset().top;
							var height = elm[0].offsetHeight;

							var parentHeight = parent.height();

							if (top > 0 && top + height < parentHeight) {
								if (attrs.inview && !wasInView) {
									wasInView = true;
									if (attrs.inviewTime) {
										timer = window.setTimeout(function () {
											scope.$eval(attrs.inview);
										}, attrs.inviewTime);
									} else {
										scope.$eval(attrs.inview);
									}
								}
							} else {
								if (timer) {
									window.clearTimeout(timer);
									timer = 0;
								}

								wasInView = false;
							}
						});
					}
				};
			}
		};
	};
});