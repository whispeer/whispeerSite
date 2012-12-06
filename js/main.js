define(['jquery', 'asset/logger', 'asset/helper', 'libs/step', 'model/state'], function ($, logger, h, step, state) {
	"use strict";

	require(['libs/sjcl'], function (sjcl) {
		sjcl.random.startCollectors();
	});

	/**
	*	Load function is called on document load.
	*	Main program entry point.
	*/
	var load = function () {
		step(function startUp() {
			logger.log("Starting up");
			require.wrap(['display', 'model/session', 'asset/i18n'], this);
		}, h.sF(function (display, session, i18n) {
			display.load();

			//Local storage available?
			if (session.storageAvailable()) {
				// We already got a session?
				if (session.logedin()) {
					session.loadOldSession();
					return;
				}
			} else {
				//Display warning message.
				display.showWarning(i18n.getValue("warning.noSessionSaving"));
				state.loaded = true;
				$(window).trigger('hashchange');
			}

			display.loadView("register");
		}), function (err) {
			//display.showError(
			console.log(err);
		});
	};

	/** Called when we logged in / restore our old session. */
	var loadData = function () {
		var time;
		var u, display;
		step(function getSession() {
			time = new Date().getTime();
			require.wrap('display', 'model/session', this);
		}, function rSession(err, d, session) {
			display = d;
			logger.log("Loading Data!");

			display.loadingMain();

			$("#sidebar-left, #sidebar-right, #nav-icons, #nav-search").show();
			$("#loginform").hide();

			logger.log("0:" + (new Date().getTime() - time));

			session.getOwnUser(this);
		}, function (ownUser) {
			u = ownUser;
			logger.log("5:" + (new Date().getTime() - time));
			u.decryptKeys();
			logger.log("10:" + (new Date().getTime() - time));
			display.loadingMainProgress(10);

			$("#username").text(u.getName());
			userManager.loadFriends(this, true);
		}, function () {
			logger.log("20:" + (new Date().getTime() - time));
			display.loadingMainProgress(20);

			u.friends(this);
		}, function (friends) {
			logger.log("30:" + (new Date().getTime() - time));
			display.loadingMainProgress(30);

			display.loadFriendShipRequests(this);
		}, function () {
			logger.log("40:" + (new Date().getTime() - time));
			display.loadingMainProgress(40);

			display.loadLatestMessages(this);
		}, function () {
			display.loadingMainProgress(70);

			state.loaded = true;
			$(window).trigger('hashchange');

			//TODO think about something more robust here.
			//mainly we need to detect whether we are restoring a session
			// or whether we newly logged in.
			if (display.loadedView === "register") {
				display.loadView("main");
			}

			display.loadingMainProgress(100);

			display.endLoadingMain();
		});
	};

	step(function startUp() {
		$(document).ready(this);
	}, function domReady() {
		load();
	});

});