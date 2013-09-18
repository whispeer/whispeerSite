define([], function () {
	"use strict";

	return function () {

		return {
			compile: function () {
				return {
					post: function (scope, elm) {
						var run = false;
						elm.bind("DOMSubtreeModified", function () {
							if (!run) {
								run = true;
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
							}
						});
					}
				};
			}
		};
	};
});