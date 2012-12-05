define(['jquery', 'helper/logger', 'helper/helper', 'libs/step', 'model/state'], function ($, logger, step, state) {
	require(['libs/sjcl'], function (sjcl) {
		sjcl.random.startCollectors();
	});

	/**
	*	Load function is called on document load.
	*	Main program entry point.
	*/
	var load = function () {
		logger.log("Starting up");
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
			display.showWarning(i18n.getValue("noSessionSaving"));
			state.loaded = true;
			$(window).trigger('hashchange');
		}

		display.loadView("register");
	};

	step(function startUp() {
		$(document).ready(this);
	}, h.sF(function domReady() {
		load();
	}));

});