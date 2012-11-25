"use strict";

// Immediately start random number generator collector.
sjcl.random.startCollectors();

$(document).ready(function () {
	ssn.load();
});

var ssn = {
	/** Are we logged in? */
	logedin: false,
	/** The current user */
	user: "",
	/** The current password */
	password: "",
	/** The current session */
	session: "",

	/** Are we already loaded? */
	loaded: false,

	/**
		Load function is called on document load.
		Main program entry point.
	*/
	load: function () {
		ssn.logger.log("Starting up");
		ssn.display.load();

		//Local storage available?
		if (ssn.storage.available) {
			// We already got a session?
			if (ssn.storage.getItem("logedin")) {
				this.session.loadOldSession();
				return;
			}
		} else {
			//Display warning message.
			ssn.display.showWarning(ssn.translation.getValue("noSessionSaving"));
			ssn.loaded = true;
			$(window).trigger('hashchange');
		}

		ssn.display.loadView("register");
	},

	/** Called when we logged in / restore our old session. */
	loadData: function () {
		ssn.logger.log("Loading Data!");

		var time = new Date().getTime();

		ssn.display.loadingMain();

		$("#sidebar-left, #sidebar-right, #nav-icons, #nav-search").show();
		$("#loginform").hide();

		ssn.logger.log("0:" + (new Date().getTime() - time));

		var u;
		step(function getOwnUser() {
			ssn.session.getOwnUser(this);
		}, function (ownUser) {
			u = ownUser;
			ssn.logger.log("5:" + (new Date().getTime() - time));
			u.decryptKeys();
			ssn.logger.log("10:" + (new Date().getTime() - time));
			ssn.display.loadingMainProgress(10);
			$("#username").text(u.getName());
			ssn.userManager.loadFriends(this, true);
		}, function () {
			ssn.logger.log("20:" + (new Date().getTime() - time));
			ssn.display.loadingMainProgress(20);
			u.friends(this);
		}, function (friends) {
			ssn.logger.log("30:" + (new Date().getTime() - time));
			ssn.display.loadingMainProgress(30);
			ssn.display.loadFriendShipRequests(this);
		}, function () {
			ssn.logger.log("40:" + (new Date().getTime() - time));
			ssn.display.loadingMainProgress(40);
			ssn.display.loadLatestMessages(this);
		}, function () {
			ssn.logger.log("100:" + (new Date().getTime() - time));
			ssn.loadData2();
		});
	},

	/** called near the end of the loading */
	loadData2: function () {
		ssn.display.loadingMainProgress(70);

		ssn.loaded = true;
		$(window).trigger('hashchange');

		//TODO think about something more robust here.
		//mainly we need to detect whether we are restoring a session
		// or whether we newly logged in.
		if (ssn.display.loadedView === "register") {
			ssn.display.loadView("main");
		}

		ssn.display.loadingMainProgress(100);

		//ssn.news.load();

		ssn.display.endLoadingMain();
	}
};