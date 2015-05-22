(function () {
	"use strict";
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
