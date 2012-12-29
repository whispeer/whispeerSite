define(['jquery', 'asset/logger', 'asset/helper', 'libs/step', 'model/state', 'display', 'model/session'], function ($, logger, h, step, state, display, session) {
	"use strict";

	require(['libs/sjcl'], function (sjcl) {
		sjcl.random.startCollectors();
	});

	/**
	*	Load function is called on document load.
	*	Main program entry point.
	*/
	var load = function () {
		step(function startUpLoad() {
			logger.log("Starting up");
			require.wrap(['asset/i18n'], this);
		}, h.sF(function depsLoaded(i18n) {
			display.load();

			//Local storage available?
			if (session.storageAvailable()) {
				// We already got a session?
				if (session.isOldSession()) {
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
		}), function checkError(err) {
			//display.showError(
			console.log(err);
		});
	};

	step(function startUp() {
		$(document).ready(this);
	}, function domReady() {
		load();
	});

});