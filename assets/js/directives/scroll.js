define(["directives/directivesModule"], function (directivesModule) {
	"use strict";

	var scrollDirective = function () {
		return {
			compile: function () {
				return {
					post: function (scope, elm, attrs) {
						var PUFFER = 30;

						var keepBottom = (typeof attrs.keepbottom !== "undefined");
						var bottomRelative = (typeof attrs.bottomRelative !== "undefined");

						var scrollWindow = (typeof attrs.scrollWindow !== "undefined");

						var nativeElement = elm[0];

						if (nativeElement.tagName === "BODY" || scrollWindow) {
							elm = jQuery(window);
							nativeElement = document.body;
						}

						var scrollInfo, previousScrollInfo;

						function getScrollHeight() {
							return nativeElement.scrollHeight;
						}

						function getScrollTop() {
							return elm.scrollTop();
						}

						function updateScrollInfo() {
							previousScrollInfo = scrollInfo;

							var scrollTop = getScrollTop();
							var scrollHeight = getScrollHeight();
							var scrollBottom = nativeElement.scrollHeight -  elm.innerHeight() - scrollTop;

							scrollInfo = {
								atBottom: scrollBottom <= PUFFER,
								atTop: scrollTop <= PUFFER,
								scrollHeight: scrollHeight,
								scrollTop: scrollTop,
								scrollBottom: scrollBottom
							};
						}

						function scrollTop(scrollTo) {
							elm.scrollTop(scrollTo);
						}

						function reSyncBottomScroll(previousBottom) {
							var scrollTo = getScrollHeight() -  elm.innerHeight() - previousBottom;
							scrollTop(scrollTo);
						}

						function addDOMListener() {
							if (!keepBottom && !bottomRelative) {
								return;
							}

							var runningTimer = false;
							elm.bind("DOMSubtreeModified", function () {
								if (runningTimer) {
									return;
								}

								var preModifyScrollInfo = scrollInfo;

								window.setTimeout(function () {
									runningTimer = false;

									updateScrollInfo();

									var heightDifference = preModifyScrollInfo.scrollHeight - scrollInfo.scrollHeight;

									if (heightDifference === 0) {
										return;
									}

									if (preModifyScrollInfo.atBottom && keepBottom) {
										console.info("Scroll to bottom");
										scrollTop(nativeElement.scrollHeight);
										return;
									}

									if (bottomRelative) {
										console.info("reSync Bottom Scroll");
										reSyncBottomScroll(preModifyScrollInfo.scrollBottom);
									}
								}, 25);

								runningTimer = true;
							});
						}

						addDOMListener();

						updateScrollInfo();

						var wasCalled = false;

						function evaluateCustomRule() {
							if (!attrs.custom || !attrs.atCustom) {
								return;
							}

							var scrollHeight = nativeElement.scrollHeight - elm.innerHeight();
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
								if (!wasCalled) {
									scope.$eval(attrs.atCustom);
									wasCalled = true;
								}
							} else {
								wasCalled = false;
							}
						}

						elm.bind("scroll", function() {
							updateScrollInfo();

							if (scrollInfo.atBottom) {
								if (attrs.onbottom) {
									scope.$eval(attrs.onbottom);
								}
							}

							evaluateCustomRule();
						});
					}
				};
			}
		};
	};

	directivesModule.directive("scroll", scrollDirective);
});
