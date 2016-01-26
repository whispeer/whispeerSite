(function () {
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

	var globalNot = document.getElementsByClassName("globalNotificationWrap")[0];

	if (!hasLocalStorage()) {
		addClass(globalNot, "globalNotificationWrap--visible");
	}

	function focusRegister() {
		var frame = document.getElementById("registerFrame-main");
		frame.contentWindow.document.getElementsByTagName("input")[0].focus();
	}

	var headingElement = document.getElementById("heading");

	var iframes = Array.prototype.slice.call(document.getElementsByTagName("iframe"));

	function iframeLoaded(e) {
		var inputs = Array.prototype.slice.call(e.srcElement.contentWindow.document.getElementsByTagName("input"));
		inputs.forEach(function (input) {
			input.addEventListener("click", function () {
				whispeerStopAutoFocus = true;
			});
		});
	}

	iframes.forEach(function (ele) {
		ele.addEventListener("load", iframeLoaded);
	});

/* nobody should notice this in the compiled version
	function updateImage() {
		var hour = new Date().getHours();
		var isDay = 7 < hour && hour < 20;

		if (isDay !== wasDay) {
			if (isDay) {
				removeClass(headingElement, "background--night");
			} else {
				addClass(headingElement, "background--night");
			}
		}

		wasDay = isDay;
	}

	updateImage();
	window.setInterval(updateImage, 60);
*/

	var overlayOpen = document.getElementById("video-overlay-open");
	var overlayClose = document.getElementById("video-overlay-close");
	var overlay = document.getElementById("video-overlay");
	var videoElement = document.getElementById("video-overlay-video-element");

	var registerAds = Array.prototype.slice.call(document.getElementsByClassName("register--ad"));
	registerAds.forEach(function (element) {
		element.addEventListener("click", focusRegister);
	});

	var isOpen = false;

	function close() {
		removeClass(overlay, "video-overlay--visible");
		videoElement.pause();

		isOpen = false;
	}

	function open() {
		addClass(overlay, "video-overlay--visible");
		videoElement.play();
		videoElement.focus();

		isOpen = true;
	}

	function togglePlayback() {
		if (videoElement.paused) {
			videoElement.play();
		} else {
			videoElement.pause();
		}
	}

	document.body.addEventListener("keypress", function (e) {
		if (e.keyCode === 32 && isOpen) {
			togglePlayback();
			e.preventDefault();
		}
	});

	videoElement.addEventListener("click", function (e) {
		e.stopPropagation();

		togglePlayback();
	});

	if (overlayOpen) {
		overlayOpen.addEventListener("click", open);
	}

	overlayClose.addEventListener("click", close);
	overlay.addEventListener("click", close);

	function isElementInViewport (el) {
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

	function checkTopBarVisibility() {
		var visibleClass = "backToTop--visible";
		var el = document.getElementsByClassName("backToTop")[0];

		if (isElementInViewport(headingElement)) {
			if (el.className.indexOf(visibleClass) !== -1) {
				removeClass(el, visibleClass);
			}
		} else {
			if (el.className.indexOf(visibleClass) === -1) {
				addClass(el, visibleClass);
			}
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
		return function () {
			checkAnimationVisibility();

			checkTopBarVisibility();
		};
	}

	var handler = debounce(onVisibilityChange(), 50);

	if (window.addEventListener) {
		addEventListener("DOMContentLoaded", handler, false);
		addEventListener("load", handler, false);
		addEventListener("scroll", handler, false);
		addEventListener("resize", handler, false);
	} else if (window.attachEvent)  {
		attachEvent("onDOMContentLoaded", handler);
		attachEvent("onload", handler);
		attachEvent("onscroll", handler);
		attachEvent("onresize", handler);
	}
})();
