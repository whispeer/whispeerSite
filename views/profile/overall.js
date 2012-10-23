"use strict";

ssn.display.profile = {
	userid: null,
	user: null,
	/**
	* Profile load function
	* Hide big user picture
	*/
	load: function (done) {
		ssn.logger.log("load" + done);
		$("body").addClass("profileView");

		if (typeof ssn.display.getHash("userid") === "undefined") {
			ssn.display.setHash("userid", ssn.session.userid);
		}

		var theID = ssn.display.getHash("userid");

		this.loadUser(theID, done);
	},

	hashChange: function (done) {
		ssn.logger.log("hashchange" + done);
		if (typeof ssn.display.getHash("userid") === "undefined") {
			ssn.display.setHash("userid", ssn.session.userid);
		}

		var theID = ssn.display.getHash("userid");

		this.loadUser(theID, done);
	},

	unload: function (done) {
		this.userid = null;
		this.user = null;
	},

	loadUser: function (theID, done) {
		if (theID !== this.userid) {
			this.userid = theID;
			ssn.userManager.getUser(theID, ssn.userManager.FULL, function (u) {
				ssn.display.profile.user = u;

				$("#subMenuName").text(u.getName()).attr("href", u.getLink());

				done();
			});
		} else {
			done();
		}
	}
};