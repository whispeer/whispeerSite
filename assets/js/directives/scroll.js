define(["directives/directivesModule"], function (directivesModule) {
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

	var scrollDirective = function () {
		var atBottom = false, atTop = false;
		return {
			compile: function () {
				return {
					post: function (scope, elm, attrs) {

						var keepBottom = (typeof attrs.keepbottom !== "undefined");
						var lockScrollBottom = (typeof attrs.lockscrollbottom !== "undefined");
						var scrollWindow = (typeof attrs.scrollWindow !== "undefined");
						var customOnce = (typeof attrs.customOnce !== "undefined");
						var first = elm[0];

						if (first.tagName === "BODY" || scrollWindow) {
							elm = jQuery(window);
							first = document.body;
						}

						if (attrs.lockscrolling) {
							scope.$watch(attrs.lockscrolling, function (newValue) {
								if (newValue) {
									disableScroll(elm);
								} else {
									enableScroll(elm);
								}
							});
						}

						var scrollHeight = first.scrollHeight;

						var PUFFER = 30;

						function isAtBottom() {
							return elm.scrollTop() >= (first.scrollHeight -  elm.innerHeight() - PUFFER);
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
										} else if (lockScrollBottom) {
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

						var wasCalled = false;

						elm.bind("scroll", function() {
							if (isAtBottom()) {
								if (attrs.onbottomwithauto) {
									scope.$eval(attrs.onbottomwithauto);
								}

								if (atBottom === false && attrs.onbottom) {
									scope.$eval(attrs.onbottom);
								}
							}

							if (isAtTop() && atTop === false && attrs.ontop) {
								scope.$eval(attrs.ontop);
							}

							if (attrs.custom && attrs.atCustom) {
								var scrollHeight = first.scrollHeight - elm.innerHeight();
								var scrollState = {
									scrollHeight: scrollHeight,
									scrolledHeight: elm.scrollTop(),
									height: elm.innerHeight(),
									percentage: elm.scrollTop() / scrollHeight,
									distance: (scrollHeight - elm.scrollTop()),
									distancePercentage: (scrollHeight - elm.scrollTop()) / elm.innerHeight(),
									distanceTopPercentage: (elm.scrollTop() / elm.innerHeight())
								};

								if (scope.$eval(attrs.custom, scrollState)) {
									if (!wasCalled || !customOnce) {
										scope.$eval(attrs.atCustom);
										wasCalled = true;
									}
								} else {
									wasCalled = false;
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

	directivesModule.directive("scroll", scrollDirective);
});
