var allTestFiles = [];
var TEST_REGEXP = /^\/base\/tests\/.*\.js$/i;

// Get a list of all the test files to include
Object.keys(window.__karma__.files).forEach(function(file) {
	"use strict";
	if (TEST_REGEXP.test(file)) {
		// Normalize paths to RequireJS module names.
		// If you require sub-dependencies of test files to be loaded as-is (requiring file extension)
		// then do not normalize the paths
		var normalizedTestModule = file.replace(/^\/base\/|\.js$/g, "");
		normalizedTestModule = "../../" + normalizedTestModule;
		allTestFiles.push(normalizedTestModule);
	}
});

require.config({
	// Karma serves files under /base, which is the basePath from your config file
	baseUrl: "/base/assets/js",

	paths: {
		text: "bower/requirejs-plugins/lib/text",
		json: "bower/requirejs-plugins/src/json",

		step: "step/lib/step",
		whispeerHelper: "helper/helper",
		amanda: "bower/amanda/releases/latest/amanda",
		angular: "bower/angular/angular",
		angularRoute: "bower/angular-route/angular-route",
		angularUiRouter: "bower/angular-ui-router/release/angular-ui-router",
		angularTouch: "bower/angular-touch/angular-touch",
		bluebird: "bower/bluebird/js/browser/bluebird",
		jquery: "bower/jquery/jquery",
		requirejs: "bower/requirejs/require",
		socket: "bower/socket.io-client/socket.io",
		qtip: "bower/qtip2/basic/jquery.qtip",
		imageLib: "bower/blueimp-load-image/js/load-image",
		localizationModule: "bower/angular-i18n-directive/src/localizationModule",
		workerQueue: "bower/worker-queue.js/src/index",
		PromiseWorker: "bower/require-promise-worker.js/src/index",
		dexie: "bower/dexie/dist/latest/Dexie",
		debug: "bower/visionmedia-debug/dist/debug"
	},

	// dynamically load all test files
	deps: allTestFiles,

	// we have to kickoff jasmine, as it is asynchronous
	callback: window.__karma__.start
});
