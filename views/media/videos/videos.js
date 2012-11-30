"use strict";

ssn.display.friends.main = {
	load: function (done) {
		$("body").addClass("mediaView");
		done();
	},

	hashChange: function (done) {
		done();
	},

	unload: function () {
		$("body").removeClass("mediaView");
	}
};

// TODO: give .droplet the css rule top with the value of the clicked .image element + 20 pixels.