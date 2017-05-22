/* global whispeerCommon */
(function () {
	"use strict";

	try {
		if (localStorage.getItem("whispeer.session.loggedin") === "true") {
			var locale = window.top.location.pathname.split("/")[1];
			window.top.location = "/" + locale + "/main";
		}
	} catch (e) {
		console.error(e);
	}

	var globalNot = document.getElementsByClassName("globalNotificationWrap")[0];

	if (!whispeerCommon.hasLocalStorage()) {
		whispeerCommon.addClass(globalNot, "globalNotificationWrap--visible");
	}

	var headingElement = document.getElementById("heading");

	function checkTopBarVisibility() {
		var visibleClass = "backToTop--visible";
		var el = document.getElementsByClassName("backToTop")[0];

		if (whispeerCommon.isElementInViewport(headingElement)) {
			if (el.className.indexOf(visibleClass) !== -1) {
				whispeerCommon.removeClass(el, visibleClass);
			}
		} else {
			if (el.className.indexOf(visibleClass) === -1) {
				whispeerCommon.addClass(el, visibleClass);
			}
		}
	}

	function onVisibilityChange () {
		checkTopBarVisibility();
	}

	var handler = whispeerCommon.debounce(onVisibilityChange, 50);

	if (window.addEventListener) {
		window.addEventListener("DOMContentLoaded", onVisibilityChange, false);
		window.addEventListener("load", handler, false);
		window.addEventListener("scroll", handler, false);
		window.addEventListener("resize", handler, false);
	} else if (window.attachEvent)  {
		window.attachEvent("onDOMContentLoaded", onVisibilityChange);
		window.attachEvent("onload", handler);
		window.attachEvent("onscroll", handler);
		window.attachEvent("onresize", handler);
	}
})();
