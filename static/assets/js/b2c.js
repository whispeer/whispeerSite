(function () {
	"use strict";
	var vo = document.getElementById("video-overlay-open");
	var vc = document.getElementById("video-overlay-close");
	var overlay = document.getElementsByClassName("video-overlay")[0];

	vo.addEventListener("click", function() {
		overlay.className += " video-overlay--visible";
	});

	vc.addEventListener("click", function() {
		overlay.className =
			overlay.className.replace(/(?:^|\s)video-overlay--visible(?!\S)/g, "");
	});
})();
