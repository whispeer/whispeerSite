define([], function () {
	"use strict";

	function scrollBottom(elm, times) {
		if (!times) {
			times = 4;
		}

		var first = elm[0];
		var height = first.scrollHeight;
		var okTimes = 0;

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
						if (typeof attrs.startbottom !== "undefined") {
							scrollBottom(elm, 3);
						}

						scope.$watch(attrs.scroll, function () {
							if (atBottom) {
								if (typeof attrs.keepbottom !== "undefined") {
									scrollBottom(elm, 4);
								}
							}
						});

						if (elm[0].offsetHeight + elm.scrollTop() >= elm[0].scrollHeight) {
							atBottom = true;
						} else {
							atBottom = false;
						}

						if (elm.scrollTop() === 0) {
							atTop = true;
						} else {
							atTop = false;
						}

						elm.bind("scroll", function() {
							if (elm[0].offsetHeight + elm.scrollTop() >= elm[0].scrollHeight) {
								if (atBottom === false) {
									if (attrs.onbottom) {
										scope.$eval(attrs.onbottom);
									}
								}

								atBottom = true;
							} else {
								atBottom = false;
							}

							if (elm.scrollTop() === 0) {
								if (atBottom === false) {
									if (attrs.ontop) {
										scope.$eval(attrs.ontop);
									}
								}

								atTop = true;
							} else {
								atTop = false;
							}
						});

						/*	var id = scope.$parent[attrs["scrollToId"]];
						if (id === scope.item.id) {
							setTimeout(function () {
								window.scrollTo(0, element[0].offsetTop - 100);
							}, 20);
						}*/
					}
				};
			}
		};
	};
});