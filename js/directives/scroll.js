define([], function () {
	"use strict";

	function scrollBottom(elm, times) {
		if (!times) {
			times = 4;
		}

		var first = elm[0];
		var height = first.scrollHeight;
		var okTimes = 0;

		elm.scrollTop(first.scrollHeight);

		var inter = window.setInterval(function () {
			if (first.scrollHeight !== height) {
				elm.scrollTop(first.scrollHeight);
				height = first.scrollHeight;
				okTimes = 0;
			} else {
				okTimes += 1;

				if (okTimes === times) {
					window.clearInterval(inter);
				}
			}
		}, 50);
	}

	return function () {
		var atBottom = false, atTop = false;
		return {
			compile: function () {
				return {
					post: function (scope, elm, attrs) {
						var keepBottom = (typeof attrs.keepbottom !== "undefined");
						var first = elm[0];

						var scrollHeight = first.scrollHeight;

						var PUFFER = 10;

						function isAtBottom() {
							return first.offsetHeight + elm.scrollTop() >= (first.scrollHeight - PUFFER);
						}

						function isAtTop() {
							return (elm.scrollTop() <= PUFFER);
						}

						var runningTimer = false;
						elm.bind("DOMSubtreeModified", function () {
							if (!runningTimer) {
								window.setTimeout(function () {
									runningTimer = false;
									var diff = first.scrollHeight - scrollHeight;
									if (diff !== 0) {
										if (atBottom && keepBottom) {
											scrollBottom(elm, 4);
										} else {
											if (diff > 0) {
												elm.scrollTop(elm.scrollTop() + diff);
											}
										}

										scrollHeight = first.scrollHeight;
									}
								}, 100);

								runningTimer = true;
							}
						});

						atBottom = isAtBottom();
						atTop = isAtTop();

						elm.bind("scroll", function() {
							if (isAtBottom()) {
								if (atBottom === false) {
									if (attrs.onbottom) {
										scope.$eval(attrs.onbottom);
									}
								}
							}

							if (isAtTop()) {
								if (atTop === false) {
									if (attrs.ontop) {
										scope.$eval(attrs.ontop);
									}
								}
							}

							atBottom = isAtBottom();
							atTop = isAtTop();
						});
					}
				};
			}
		};
	};
});