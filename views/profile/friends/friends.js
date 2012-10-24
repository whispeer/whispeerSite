"use strict";

ssn.display.profile.friends = {
	load: function (done) {
		ssn.display.profile.user.friends(function (d) {
			var names = $("<div>");
			var i;
			for (i = 0; i < d.length; i += 1) {
				names.append($("<div>").append($("<a>").attr("href", d[i].getLink()).text(d[i].getName())));
			}

			$("#friendsList").append(names);
			done();
		});
	},
	hashChange: function (done) {
		done();
	},
	unload: function () {

	}
};