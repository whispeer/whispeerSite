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

	var videoShown = false;

	var overlayOpen = document.getElementById("video-overlay-open");
	var overlayClose = document.getElementById("video-overlay-close");
	var overlay = document.getElementById("video-overlay");
	var overlayWrapper = document.getElementById("video-overlay-wrapper");

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
		var overlayIframe = document.createElement("iframe");
		
		attributes.forEach(function (attr) {
			overlayIframe.setAttribute(attr.name, attr.value);
		});

		overlayWrapper.parentNode.replaceChild(overlayIframe, overlayWrapper);
	}

	function close() {
		overlay.className =
			overlay.className.replace(/(?:^|\s)video-overlay--visible(?!\S)/g, "");
	}

	function open() {
		overlay.className += " video-overlay--visible";

		if (videoShown) {

		} else {
			showVideo();
		}
	}

	overlayOpen.addEventListener("click", open);

	overlayClose.addEventListener("click", close);
	overlay.addEventListener("click", close);
})();
