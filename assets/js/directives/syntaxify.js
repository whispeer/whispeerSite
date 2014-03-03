define([], function () {
	"use strict";

	return function ($timeout) {
		return {
			restrict: "A",
			link: function (scope, elm) {
				$timeout(function () {
					var text = elm.text();
					var parts = text.split(/\r\n|\n\r|\r|\n/);
					var br;

					elm.html("");

					var i;
					for (i = 0; i < parts.length; i += 1) {
						br = jQuery("<br>");
						elm.append(document.createTextNode(parts[i]));
						elm.append(br);
					}
				});
			}
		};
	};
});