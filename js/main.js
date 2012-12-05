define(['jquery', 'helper/logger', 'libs/step'], function ($, logger) {
	require(['libs/sjcl'], function (sjcl) {
		sjcl.random.startCollectors();
	});

	logger.log("starting up");
});