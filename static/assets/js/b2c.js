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

	var overlayOpen = document.getElementById("video-overlay-open");
	var overlayClose = document.getElementById("video-overlay-close");
	var overlay = document.getElementsByClassName("video-overlay")[0];

	function close() {
		overlay.className =
			overlay.className.replace(/(?:^|\s)video-overlay--visible(?!\S)/g, "");
	}

	function open() {
		overlay.className += " video-overlay--visible";
	}

	overlayOpen.addEventListener("click", open);

	overlayClose.addEventListener("click", close);
	overlay.addEventListener("click", close);
})();
