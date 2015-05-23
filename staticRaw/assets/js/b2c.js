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

	function focusRegister() {
		var frame = document.getElementById("registerFrame-main");
		frame.contentWindow.document.getElementsByTagName("input")[0].focus();
	}

	var videoShown = false, overlayClosed = true, wasDay;

	var headingElement = document.getElementById("heading");

	function removeClass(element, classToRemove) {
		element.className =
			element.className.replace(new RegExp("(?:^|\\s)" + classToRemove + "(?!\\S)", "g"), "");
	}

	function addClass(element, classToAdd) {
		element.className += " " + classToAdd;
	}

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

	var overlayOpen = document.getElementById("video-overlay-open");
	var overlayClose = document.getElementById("video-overlay-close");
	var overlay = document.getElementById("video-overlay");
	var overlayWrapper = document.getElementById("video-overlay-video");
	var overlayIframe;

	var registerAds = Array.prototype.slice.call(document.getElementsByClassName("register--ad"));
	registerAds.forEach(function (element) {
		element.addEventListener("click", focusRegister);
	});

	function showVideo() {
		if (videoShown) {
			return;
		}

		videoShown = true;
		var attributes = Array.prototype.slice.call(overlayWrapper.attributes).filter(function (attr) {
			return attr.name.indexOf("data-") === 0;
		}).map(function (attr) {
			return {
				name: attr.name.substr(5),
				value: attr.value
			};
		});
		overlayIframe = document.createElement("iframe");

		attributes.forEach(function (attr) {
			overlayIframe.setAttribute(attr.name, attr.value);
		});

		overlayWrapper.parentNode.replaceChild(overlayIframe, overlayWrapper);

		var interval = setInterval(function () {
			overlayIframe.contentWindow.postMessage(JSON.stringify({"event":"listening","id":1}), "https://www.youtube-nocookie.com");

			if (!overlayIframe.contentWindow) {
				window.clearInterval(interval);
			}
		}, 250);

		overlayIframe.addEventListener("load", function () {
			window.clearInterval(interval);
		});
	}

	function sendCommand(command) {
		var youtubeCommand = window.JSON.stringify({
			event: "command",
			func: command
		});
		overlayIframe.contentWindow.postMessage(youtubeCommand, "https://www.youtube-nocookie.com");
	}

	function playVideo() {
		sendCommand("playVideo");
	}

	function pauseVideo() {
		sendCommand("pauseVideo");
	}

	window.addEventListener("message", function (event) {
		var data = JSON.parse(event.data);

		if (data.event === "onReady") {
			if (overlayClosed) {
				pauseVideo();
			} else {
				playVideo();
			}
		}
	}, false);

	function close() {
		overlayClosed = true;
		removeClass(overlay, "video-overlay--visible");
		pauseVideo();
	}

	function open() {
		overlayClosed = false;

		addClass(overlay, "video-overlay--visible");

		showVideo();
		playVideo();
	}

	window.setTimeout(function () {
		showVideo();
	}, 10000);

	overlayOpen.addEventListener("click", open);

	overlayClose.addEventListener("click", close);
	overlay.addEventListener("click", close);
})();
