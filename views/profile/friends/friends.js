"use strict";

ssn.display.profile.friends = {
	load: function (done) {
		ssn.display.profile.user.friends(function (d) {
			var names = "", i;
			for (i = 0; i < d.length; i += 1) {
				names += d[i].getName();
			}
			
			$("#friendsList").text(names);
			done();
		});
	},
	hashChange: function (done) {
		done();
	},
	unload: function () {
	
	}
};