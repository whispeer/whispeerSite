define(['jquery', 'helper/logger', 'helper/helper', 'libs/step', 'model/state'], function ($, logger, h, step, state) {
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
			require.wrap(['display', 'model/session', 'helper/i18n'], this);
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

	step(function startUp() {
		$(document).ready(this);
	}, function domReady() {
		load();
	});

});