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

	var videoShown = false, overlayClosed = true;

	var overlayOpen = document.getElementById("video-overlay-open");
	var overlayClose = document.getElementById("video-overlay-close");
	var overlay = document.getElementById("video-overlay");
	var overlayWrapper = document.getElementById("video-overlay-wrapper");
	var overlayIframe;

	var registerAds = Array.prototype.slice.call(document.getElementsByClassName("register--ad"));
	registerAds.forEach(function (element) {
		element.addEventListener("click", focusRegister);
	});

	function showVideo() {
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
			overlayIframe.contentWindow.postMessage(JSON.stringify({"event":"listening","id":1}), "https://www.youtube.com");

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
		overlayIframe.contentWindow.postMessage(youtubeCommand, "https://www.youtube.com");
	}

	function playVideo() {
		sendCommand("playVideo");
	}

	function pauseVideo() {
		sendCommand("pauseVideo");
	}

	window.addEventListener("message", function (event) {
		var data = JSON.parse(event.data);

		if (data.event === "onReady" && overlayClosed) {
			pauseVideo();
		}
	}, false);

	function close() {
		overlayClosed = true;

		overlay.className =
			overlay.className.replace(/(?:^|\s)video-overlay--visible(?!\S)/g, "");

		pauseVideo();
	}

	function open() {
		overlayClosed = false;

		overlay.className += " video-overlay--visible";

		if (videoShown) {
			playVideo();
		} else {
			showVideo();
		}
	}

	overlayOpen.addEventListener("click", open);

	overlayClose.addEventListener("click", close);
	overlay.addEventListener("click", close);
})();
