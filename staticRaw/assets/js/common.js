window.whispeerCommon = (function () {
	"use strict";

	window.whispeerStopAutoFocus = false;

	try {
		if (localStorage.getItem("whispeer.session.loggedin") === "true") {
			var locale = window.top.location.pathname.split("/")[1];
			window.top.location = "/" + locale + "/main";
		}
	} catch (e) {
		console.error(e);
	}

	function hasLocalStorage() {
		try {
			localStorage.setItem("localStorageTest", "localStorageTest");
			localStorage.removeItem("localStorageTest");
			return true;
		} catch (e) {
			return false;
		}
	}

	function removeClass(element, classToRemove) {
		element.className =
			element.className.replace(new RegExp("(?:^|\\s)" + classToRemove + "(?!\\S)", "g"), "");
	}

	function addClass(element, classToAdd) {
		element.className += " " + classToAdd;
	}

	var iframes = Array.prototype.slice.call(document.getElementsByTagName("iframe"));

	function iframeLoaded(e) {
		var inputs = Array.prototype.slice.call(e.srcElement.contentWindow.document.getElementsByTagName("input"));
		inputs.forEach(function (input) {
			input.addEventListener("click", function () {
				window.whispeerStopAutoFocus = true;
			});
		});
	}

	iframes.forEach(function (ele) {
		ele.addEventListener("load", iframeLoaded);
	});

	function isElementInViewport (el) {
		if(!el) {
			return false;
		}

		var rect = el.getBoundingClientRect();

		var windowHeight = window.innerHeight || document.documentElement.clientHeight;
		var windowWidth = window.innerWidth || document.documentElement.clientWidth;

		return (
			(rect.top >= 0 || rect.bottom >= 0) &&
			(rect.top <= windowHeight || rect.bottom <= windowHeight) &&

			(rect.left >= 0 || rect.right >= 0) &&
			(rect.left <= windowWidth || rect.right <= windowWidth)
		);
	}

	function checkAnimationVisibility() {
		var el = document.getElementsByClassName("animation-box")[0];
		if (isElementInViewport(el) && el.className.indexOf("animation-start") === -1) {
			addClass(el, "animation-start");
		}
	}

	function debounce(func, wait) {
		var running = false;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				running = false;
				func.apply(context, args);
			};

			if (!running) {
				setTimeout(later, wait);
			}
		};
	}

	function onVisibilityChange () {
		checkAnimationVisibility();
	}

	var handler = debounce(onVisibilityChange, 50);

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

	return {
		debounce: debounce,
		addClass: addClass,
		removeClass: removeClass,
		hasLocalStorage: hasLocalStorage,
		isElementInViewport: isElementInViewport
	}
})();
