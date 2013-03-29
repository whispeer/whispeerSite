define(["jquery"], function ($) {
	"use strict";

	var mediaMain = {
		load: function (done) {
			//media.loadMedia();
			this.eventListener();
			done();
		},
		eventListener: function() {
			$(".album").click(function() {
				var id = $(this).attr("id").substr(6);
				$("#main").html("");
				$("#main").append("<div id=\"imageView\"><div class=\"arrow\" id=\"prev\"></div><div id=\"image\"></div><div class=\"arrow\" id=\"next\"></div><div id=\"meta\"></div><div id=\"comments\"></div>");
				$("#image").append("<img src=\"img/testbild_1.jpg\">");
				$("#meta").append("<p class=\"awesomness\">20 Leute finden das Awesome!</p><p class=\"commentcount\">Es wurden 5 Kommentare hinterlassen</p>");
				$("#comments").append("<ol id=\"commentList\"></ol>");
				//for(var i = 0; i < comments.length; i++) { // Example for commentloop
				$("#commentList").append("<li class=\"comment\" id=\"comment-1\"></li>");
			});
			$("#prev").click(function() {
				//var imgId; // Get the id/src of the previous image
				//$("#image img").attr("src", imgId);
				console.log("Previous image!")
			});
			$("#next").click(function() {
				//var imgId; // Get the id/src of the next image
				//$("#image img").attr("src", imgId);
				console.log("Next Image!")
			});
		},
		unload: function () {
		},
		hashChange: function (done) {
			done();
		}
	};

	return mediaMain;
});