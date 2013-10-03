define([], function () {
	"use strict";

	// left: 37, up: 38, right: 39, down: 40,
	// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
	var keys = [37, 38, 39, 40];

	function preventDefault(e) {
		e = e || window.event;
		if (e.preventDefault) {
			e.preventDefault();
		}
		e.returnValue = false;
	}

	function keydown(e) {
		for (var i = keys.length; i--;) {
		if (e.keyCode === keys[i]) {
		preventDefault(e);
		return;
		}
		}
	}

	function wheel(e) {
		preventDefault(e);
	}

	function disableScroll(elm) {
		if (elm.addEventListener) {
			elm.addEventListener("DOMMouseScroll", wheel, false);
		}
		elm.onmousewheel = wheel;
		elm.onkeydown = keydown;
	}

	function enableScroll(elm) {
		if (elm.removeEventListener) {
			elm.removeEventListener("DOMMouseScroll", wheel, false);
		}
		elm.onmousewheel = elm.onmousewheel = elm.onkeydown = null;
	}

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

						if (attrs.lockScrolling) {
							scope.$watch(attrs.lockScrolling, function (newValue) {
								if (newValue) {
									disableScroll(elm);
								} else {
									enableScroll(elm);
								}
							});
						}

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